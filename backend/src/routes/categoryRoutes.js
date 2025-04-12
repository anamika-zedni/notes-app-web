const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");
const auth = require("../middleware/auth");
const validateRequest = require("../middleware/validateRequest");

// Validation rules
const categoryValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ min: 2, max: 30 })
    .withMessage("Category name must be between 2 and 30 characters"),
  body("color")
    .optional()
    .matches(/^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage("Color must be a valid hex color code (with or without #)"),
];

// Routes
router.post("/", auth, categoryValidation, validateRequest, createCategory);
router.get("/", auth, getCategories);
router.put("/:id", auth, categoryValidation, validateRequest, updateCategory);
router.delete("/:id", auth, deleteCategory);

module.exports = router;
