const mongoose = require("mongoose");

const sharedSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  permission: {
    type: String,
    enum: ["view", "edit"],
    default: "view",
  },
});

const attachmentSchema = new mongoose.Schema({
  filename: String,
  originalname: String,
  mimetype: String,
  size: Number,
  path: String,
});

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    shared: [sharedSchema],
    color: {
      type: String,
      default: "ffffff", // Default white color without #
      validate: {
        validator: function (v) {
          return /^([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: "Color must be a valid hex color code without #",
      },
    },
    attachments: [attachmentSchema],
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
  },
  {
    timestamps: true, // This will add createdAt and updatedAt fields automatically
  }
);

// Add index for better query performance
noteSchema.index({ user_id: 1, title: 1 });
noteSchema.index({ shared: 1 });

module.exports = mongoose.model("Note", noteSchema);
