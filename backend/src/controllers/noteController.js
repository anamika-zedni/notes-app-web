const Note = require("../models/Note");
const User = require("../models/User");
const fs = require("fs-extra");
const path = require("path");

exports.createNote = async (req, res) => {
  try {
    // Parse JSON strings from FormData
    const title = req.body.title;
    const body = req.body.body;
    const color = req.body.color;
    const categories = JSON.parse(req.body.categories || "[]");
    const shared = JSON.parse(req.body.shared || "[]");
    const files = req.files;

    const formattedColor = color ? color.replace("#", "") : "ffffff";

    // Format shared users
    const validatedShared = shared
      .filter((share) => share.id !== req.user.userId)
      .map((share) => ({
        id: share.id,
        username: share.username,
        permission: share.permission,
      }));

    // Format attachments
    const attachments =
      files?.map((file) => ({
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
      })) || [];

    const note = new Note({
      title,
      body,
      color: formattedColor,
      user_id: req.user.userId,
      categories,
      shared: validatedShared,
      attachments,
    });

    await note.save();
    await note.populate("categories", "name color");

    const formattedNote = {
      id: note._id,
      title: note.title,
      body: note.body,
      color: `#${note.color}`,
      categories:
        note.categories?.map((cat) => ({
          id: cat._id,
          name: cat.name,
          color: `#${cat.color}`,
        })) || [],
      shared: note.shared,
      attachments: note.attachments.map((file) => ({
        id: file._id,
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      })),
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };

    res.status(201).json({
      success: true,
      message: "Note created successfully",
      note: formattedNote,
    });
  } catch (error) {
    // Clean up uploaded files if note creation fails
    if (req.files) {
      await Promise.all(req.files.map((file) => fs.unlink(file.path)));
    }
    console.error("Note creation error:", error);
    res.status(500).json({
      success: false,
      errors: {
        server: "Error creating note",
      },
    });
  }
};

exports.updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const files = req.files;

    // Parse JSON strings from FormData
    const title = req.body.title;
    const body = req.body.body;
    const color = req.body.color;
    const categories = JSON.parse(req.body.categories || '[]');
    const shared = JSON.parse(req.body.shared || '[]');

    const note = await Note.findOne({
      _id: id,
      $or: [
        { user_id: userId },
        { shared: { $elemMatch: { id: userId, permission: "edit" } } }
      ]
    });

    if (!note) {
      // Clean up any uploaded files if note not found
      if (files) {
        await Promise.all(files.map(file => fs.unlink(file.path)));
      }
      return res.status(404).json({
        success: false,
        errors: { note: "Note not found or access denied" }
      });
    }

    // Update basic fields
    if (title) note.title = title;
    if (body) note.body = body;
    if (color) note.color = color.replace("#", "");
    if (categories) note.categories = categories;

    // Update shared users if provided
    if (shared) {
      const validatedShared = shared
        .filter(share => share.id !== userId)
        .map(share => ({
          id: share.id,
          username: share.username,
          permission: share.permission
        }));
      note.shared = validatedShared;
    }

    // Add new files if any
    if (files && files.length > 0) {
      const newAttachments = files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path
      }));
      note.attachments.push(...newAttachments);
    }

    await note.save();
    await note.populate("categories", "name color");

    // Format the response
    const formattedNote = {
      id: note._id,
      title: note.title,
      body: note.body,
      color: `#${note.color}`,
      categories: note.categories?.map(cat => ({
        id: cat._id,
        name: cat.name,
        color: `#${cat.color}`
      })) || [],
      shared: note.shared,
      attachments: note.attachments.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      })),
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    };

    res.json({
      success: true,
      message: "Note updated successfully",
      note: formattedNote
    });
  } catch (error) {
    // Clean up any uploaded files if there's an error
    if (req.files) {
      await Promise.all(req.files.map(file => fs.unlink(file.path)));
    }
    console.error("Note update error:", error);
    res.status(500).json({
      success: false,
      errors: { server: "Error updating note" }
    });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Find note and check ownership
    const note = await Note.findOne({
      _id: id,
      user_id: userId, // Only owner can delete
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        errors: {
          note: "Note not found or access denied",
        },
      });
    }

    // Delete the note
    await note.deleteOne();

    res.json({
      success: true,
      message: "Note deleted successfully",
    });
  } catch (error) {
    console.error("Note deletion error:", error);
    res.status(500).json({
      success: false,
      errors: {
        server: "Error deleting note",
      },
    });
  }
};

exports.shareNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, permission } = req.body;
    const userId = req.user.userId;

    // Find the user to share with
    const shareWithUser = await User.findOne({
      username: username.toLowerCase(),
    });

    if (!shareWithUser) {
      return res.status(404).json({
        success: false,
        errors: {
          username: "User not found",
        },
      });
    }

    // Check if trying to share with self
    if (shareWithUser._id.toString() === userId) {
      return res.status(400).json({
        success: false,
        errors: {
          username: "Cannot share note with yourself",
        },
      });
    }

    // Find note and verify ownership
    const note = await Note.findOne({
      _id: id,
      user_id: userId,
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        errors: {
          note: "Note not found or access denied",
        },
      });
    }

    // Check if already shared with user
    const existingShareIndex = note.sharedWith.findIndex(
      (share) => share.user.toString() === shareWithUser._id.toString()
    );

    if (existingShareIndex !== -1) {
      // Update existing share permission
      note.sharedWith[existingShareIndex].permission = permission;
    } else {
      // Add new share
      note.sharedWith.push({
        user: shareWithUser._id,
        permission,
      });
    }

    await note.save();

    // Populate the shared user details for response
    await note.populate("sharedWith.user", "username");

    res.json({
      success: true,
      message: "Note shared successfully",
      sharedWith: {
        username: shareWithUser.username,
        permission,
      },
    });
  } catch (error) {
    console.error("Note sharing error:", error);
    res.status(500).json({
      success: false,
      errors: {
        server: "Error sharing note",
      },
    });
  }
};

exports.getHomeData = async (req, res) => {
  try {
    const userId = req.user.userId;
    const currentPage = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Select color field explicitly in the query
    const notes = await Note.find({
      $or: [
        { user_id: userId },
        {
          sharedWith: {
            $elemMatch: {
              user: userId,
            },
          },
        },
      ],
    })
      .select(
        "title body color createdAt updatedAt user_id sharedWith categories"
      )
      .skip((currentPage - 1) * limit)
      .limit(limit)
      .populate("user_id", "username email")
      .populate("sharedWith.user", "username email")
      .populate("categories", "name color")
      .sort({ updatedAt: -1 });

    const totalNotes = await Note.countDocuments({
      $or: [
        { user_id: userId },
        {
          sharedWith: {
            $elemMatch: {
              user: userId,
            },
          },
        },
      ],
    });

    const totalPages = Math.ceil(totalNotes / limit);

    const formattedNotes = notes.map((note) => ({
      id: note._id,
      title: note.title,
      body: note.body,
      color: `#${note.color || "ffffff"}`, // Add # when sending to client
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      author: {
        id: note.user_id._id,
        username: note.user_id.username,
        email: note.user_id.email,
      },
      sharedWith: note.sharedWith.map((share) => ({
        user: {
          id: share.user._id,
          username: share.user.username,
          email: share.user.email,
        },
        permission: share.permission,
      })),
      categories: note.categories.map((cat) => ({
        id: cat._id,
        name: cat.name,
        color: `#${cat.color}`,
      })),
      isOwner: note.user_id._id.toString() === userId,
      userPermission:
        note.user_id._id.toString() === userId
          ? "owner"
          : note.sharedWith.find(
              (share) => share.user._id.toString() === userId
            )?.permission,
    }));

    res.json({
      success: true,
      message: "Home data retrieved successfully",
      pagination: {
        currentPage,
        totalPages,
        totalNotes,
        limit,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      },
      notes: formattedNotes,
    });
  } catch (error) {
    console.error("Home data retrieval error:", error);
    res.status(500).json({
      success: false,
      errors: {
        server: "Error retrieving home data",
      },
    });
  }
};

exports.revokeAccess = async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body;
    const userId = req.user.userId;

    // Find user whose access is being revoked
    const revokeUser = await User.findOne({
      username: username.toLowerCase(),
    });

    if (!revokeUser) {
      return res.status(404).json({
        success: false,
        errors: {
          username: "User not found",
        },
      });
    }

    // Find note and verify ownership
    const note = await Note.findOne({
      _id: id,
      user_id: userId, // Only owner can revoke access
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        errors: {
          note: "Note not found or access denied",
        },
      });
    }

    // Remove user from sharedWith array
    const shareIndex = note.sharedWith.findIndex(
      (share) => share.user.toString() === revokeUser._id.toString()
    );

    if (shareIndex === -1) {
      return res.status(400).json({
        success: false,
        errors: {
          username: "This user doesn't have access to the note",
        },
      });
    }

    note.sharedWith.splice(shareIndex, 1);
    await note.save();

    res.json({
      success: true,
      message: "Access revoked successfully",
      revokedFrom: {
        username: revokeUser.username,
      },
    });
  } catch (error) {
    console.error("Revoke access error:", error);
    res.status(500).json({
      success: false,
      errors: {
        server: "Error revoking access",
      },
    });
  }
};

exports.addAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        errors: {
          file: "No file uploaded",
        },
      });
    }

    const note = await Note.findOne({
      _id: id,
      user_id: userId,
    });

    if (!note) {
      await fs.unlink(file.path);
      return res.status(404).json({
        success: false,
        errors: {
          note: "Note not found or access denied",
        },
      });
    }

    note.attachments.push({
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
    });

    await note.save();

    res.json({
      success: true,
      message: "File uploaded successfully",
      attachment: {
        id: note.attachments[note.attachments.length - 1]._id,
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      },
    });
  } catch (error) {
    if (req.file) {
      await fs.unlink(req.file.path);
    }
    console.error("File upload error:", error);
    res.status(500).json({
      success: false,
      errors: {
        server: "Error uploading file",
      },
    });
  }
};

exports.removeAttachment = async (req, res) => {
  try {
    const { id, fileId } = req.params;
    const userId = req.user.userId;

    const note = await Note.findOne({
      _id: id,
      user_id: userId,
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        errors: {
          note: "Note not found or access denied",
        },
      });
    }

    const attachment = note.attachments.id(fileId);
    if (!attachment) {
      return res.status(404).json({
        success: false,
        errors: {
          file: "File not found",
        },
      });
    }

    await fs.unlink(attachment.path);
    note.attachments.pull(fileId);
    await note.save();

    res.json({
      success: true,
      message: "File removed successfully",
    });
  } catch (error) {
    console.error("File removal error:", error);
    res.status(500).json({
      success: false,
      errors: {
        server: "Error removing file",
      },
    });
  }
};

exports.deleteAttachment = async (req, res) => {
  try {
    const { noteId, filename } = req.params;
    const userId = req.user.userId;

    const note = await Note.findOne({
      _id: noteId,
      $or: [
        { user_id: userId },
        { shared: { $elemMatch: { id: userId, permission: "edit" } } },
      ],
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        errors: { note: "Note not found or access denied" },
      });
    }

    // Find attachment by filename
    const attachmentIndex = note.attachments.findIndex(
      (att) => att.filename === filename
    );

    if (attachmentIndex === -1) {
      return res.status(404).json({
        success: false,
        errors: { attachment: "Attachment not found" },
      });
    }

    // Construct file path using __dirname, userId, and filename
    const filePath = path.join(__dirname, "../../uploads", userId, filename);

    // Remove the file from storage
    try {
      await fs.unlink(filePath);
    } catch (unlinkError) {
      console.error("Error deleting file:", unlinkError);
      // Continue with removing from database even if file deletion fails
    }

    // Remove from attachments array
    note.attachments.splice(attachmentIndex, 1);
    await note.save();

    res.json({
      success: true,
      message: "Attachment deleted successfully",
    });
  } catch (error) {
    console.error("Delete attachment error:", error);
    res.status(500).json({
      success: false,
      errors: { server: "Error deleting attachment" },
    });
  }
};

exports.removeCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId } = req.body;
    const userId = req.user.userId;

    const note = await Note.findOne({
      _id: id,
      $or: [
        { user_id: userId },
        {
          sharedWith: {
            $elemMatch: {
              user: userId,
              permission: "edit",
            },
          },
        },
      ],
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        errors: {
          note: "Note not found or access denied",
        },
      });
    }

    // Remove category from note
    note.categories = note.categories.filter(
      (cat) => cat.toString() !== categoryId
    );

    await note.save();
    await note.populate("categories", "name color");

    res.json({
      success: true,
      message: "Category removed from note successfully",
      note: {
        id: note._id,
        categories: note.categories.map((cat) => ({
          id: cat._id,
          name: cat.name,
          color: `#${cat.color}`,
        })),
      },
    });
  } catch (error) {
    console.error("Remove category error:", error);
    res.status(500).json({
      success: false,
      errors: {
        server: "Error removing category from note",
      },
    });
  }
};

exports.addCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId } = req.body;
    const userId = req.user.userId;

    const note = await Note.findOne({
      _id: id,
      $or: [
        { user_id: userId },
        {
          sharedWith: {
            $elemMatch: {
              user: userId,
              permission: "edit",
            },
          },
        },
      ],
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        errors: {
          note: "Note not found or access denied",
        },
      });
    }

    // Check if category already exists in note
    if (note.categories.includes(categoryId)) {
      return res.status(400).json({
        success: false,
        errors: {
          category: "Category already added to this note",
        },
      });
    }

    // Add category to note
    note.categories.push(categoryId);
    await note.save();
    await note.populate("categories", "name color");

    res.json({
      success: true,
      message: "Category added to note successfully",
      note: {
        id: note._id,
        categories: note.categories.map((cat) => ({
          id: cat._id,
          name: cat.name,
          color: `#${cat.color}`,
        })),
      },
    });
  } catch (error) {
    console.error("Add category error:", error);
    res.status(500).json({
      success: false,
      errors: {
        server: "Error adding category to note",
      },
    });
  }
};

exports.getNotes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const categoryId = req.query.category;

    const query = { user_id: req.user.userId };

    // Add category filter if provided
    if (categoryId) {
      query.categories = categoryId;
    }

    const [notes, total] = await Promise.all([
      Note.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("categories", "name color")
        .populate("author", "username")
        .populate("sharedWith.user", "username"),
      Note.countDocuments(query),
    ]);

    res.json({
      success: true,
      message: "Notes retrieved successfully",
      notes,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalNotes: total,
        limit,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get notes error:", error);
    res.status(500).json({
      success: false,
      errors: {
        server: "Error retrieving notes",
      },
    });
  }
};