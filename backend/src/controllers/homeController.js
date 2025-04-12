const Note = require("../models/Note");
const User = require("../models/User");
const { baseUrl, uploadsPath } = require("../config/config");
const path = require("path");

exports.getHomeData = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // Build search query for both owned and shared notes
    let searchQuery = {
      $or: [
        { user_id: userId },
        { "shared.id": userId }, // Updated to match new shared structure
      ],
    };

    // Add text search for title and body
    if (req.query.query) {
      searchQuery.$and = [
        {
          $or: [
            { title: { $regex: req.query.query, $options: "i" } },
            { body: { $regex: req.query.query, $options: "i" } },
          ],
        },
      ];
    }

    // Add color search
    if (req.query.color) {
      if (!searchQuery.$and) searchQuery.$and = [];
      searchQuery.$and.push({
        color: req.query.color.replace("#", ""),
      });
    }

    // Add category search - updated for single category selection
    if (req.query.category && req.query.category !== "all") {
      if (!searchQuery.$and) searchQuery.$and = [];
      searchQuery.$and.push({
        categories: req.query.category // Single category ID
      });
    }

    const notes = await Note.find(searchQuery)
      .populate("user_id", "username email")
      .populate("categories", "name color")
      .select("title body color createdAt updatedAt user_id shared categories attachments") // Added attachments
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalNotes = await Note.countDocuments(searchQuery);
    const totalPages = Math.ceil(totalNotes / limit);

    // Format notes for response
    const formattedNotes = notes.map((note) => ({
      id: note._id,
      title: note.title,
      body: note.body,
      color: `#${note.color || "ffffff"}`,
      categories: note.categories?.map((category) => ({
        id: category?._id,
        name: category?.name,
        color: `#${category?.color || "ffffff"}`,
      })) || [],
      attachments: note.attachments?.map(attachment => ({
        originalname: attachment.originalname,
        size: attachment.size,
        mimetype: attachment.mimetype,
        filename: attachment.filename,
        path: attachment.path
      })) || [],
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      author: note.user_id ? {
        id: note.user_id._id,
        username: note.user_id.username,
        email: note.user_id.email
      } : null,
      shared: note.shared || [],
      isOwner: note.user_id?._id.toString() === userId,
      userPermission: note.user_id?._id.toString() === userId
        ? "owner"
        : note.shared?.find((share) => share.id === userId)?.permission || "none"
    }));

    res.json({
      success: true,
      message: "Notes retrieved successfully",
      pagination: {
        currentPage: page,
        totalPages,
        totalNotes,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      notes: formattedNotes,
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      success: false,
      errors: {
        server: "Error searching notes",
      },
    });
  }
};
