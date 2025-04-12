const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const Category = require("../models/Category"); // Add this import
const {
  createNote,
  updateNote,
  deleteNote,
  shareNote,
  revokeAccess,
  addAttachment,
  removeAttachment,
  removeCategory,
  addCategory,
  deleteAttachment,
} = require("../controllers/noteController");
const auth = require("../middleware/auth");
const validateRequest = require("../middleware/validateRequest");
const upload = require("../utils/fileUpload"); // Updated import

// Validation rules for note creation
const createNoteValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 100 })
    .withMessage("Title must be less than 100 characters"),

  body("body").trim().notEmpty().withMessage("Note content is required"),

  body("color")
    .optional()
    .matches(/^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage("Color must be a valid hex color code (with or without #)"),

  body("categories")
    .optional()
    .isArray()
    .withMessage("Categories must be an array")
    .custom(async (categories, { req }) => {
      if (!categories?.length) return true;

      const userId = req.user.userId;
      const validCategories = await Category.find({
        _id: { $in: categories },
        user_id: userId,
      });

      if (validCategories.length !== categories.length) {
        throw new Error("One or more categories are invalid");
      }
      return true;
    }),
];

// Validation rules for note update
const updateNoteValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 100 })
    .withMessage("Title must be less than 100 characters"),

  body("body").trim().notEmpty().withMessage("Note content is required"),

  body("color")
    .optional()
    .matches(/^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage("Color must be a valid hex color code (with or without #)"),

  body("categories")
    .optional()
    .isArray()
    .withMessage("Categories must be an array")
    .custom(async (categories, { req }) => {
      if (!categories?.length) return true;

      const userId = req.user.userId;
      const validCategories = await Category.find({
        _id: { $in: categories },
        user_id: userId,
      });

      if (validCategories.length !== categories.length) {
        throw new Error("One or more categories are invalid");
      }
      return true;
    }),
];

// Validation rules for note sharing
const shareNoteValidation = [
  body("username").trim().notEmpty().withMessage("Username is required"),
  body("permission")
    .isIn(["view", "edit"])
    .withMessage("Permission must be either view or edit"),
];

// Validation rules for revoking access
const revokeAccessValidation = [
  body("username").trim().notEmpty().withMessage("Username is required"),
];

// Add validation for category removal
const removeCategoryValidation = [
  body("categoryId")
    .notEmpty()
    .withMessage("Category ID is required")
    .isMongoId()
    .withMessage("Invalid category ID"),
];

// Add validation for adding categories
const addCategoryValidation = [
  body("categoryId")
    .notEmpty()
    .withMessage("Category ID is required")
    .isMongoId()
    .withMessage("Invalid category ID")
    .custom(async (categoryId, { req }) => {
      const userId = req.user.userId;
      const category = await Category.findOne({
        _id: categoryId,
        user_id: userId,
      });

      if (!category) {
        throw new Error("Category not found or access denied");
      }
      return true;
    }),
];

// Create note route
router.post(
  "/",
  auth,
  upload.array("attachments", 5), // Allow up to 5 files
  createNote
);

// Update note route
router.put("/:id", auth, upload.array("attachments"), updateNote);

// Delete note route
router.delete("/:id", auth, deleteNote);

// Share note route
router.post(
  "/:id/share",
  auth,
  shareNoteValidation,
  validateRequest,
  shareNote
);

// Revoke access route
router.delete(
  "/:id/share",
  auth,
  revokeAccessValidation,
  validateRequest,
  revokeAccess
);

// Add file to note
router.post("/:id/attachments", auth, upload.single("file"), addAttachment);

// Remove file from note
router.delete("/:id/attachments/:fileId", auth, removeAttachment);

// Add new route for removing category from note
router.delete(
  "/:id/categories",
  auth,
  removeCategoryValidation,
  validateRequest,
  removeCategory
);

// Add the new route for adding category to note
router.post(
  "/:id/categories",
  auth,
  addCategoryValidation,
  validateRequest,
  addCategory
);

// Add the new route for deleting attachment by filename
router.delete("/:noteId/attachments/:filename", auth, deleteAttachment);

module.exports = router;
