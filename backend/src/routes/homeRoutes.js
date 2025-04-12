const express = require("express");
const router = express.Router();
const { query } = require("express-validator");
const { getHomeData } = require("../controllers/homeController");
const auth = require("../middleware/auth");
const validateRequest = require("../middleware/validateRequest");

const searchValidation = [
  query("query").optional().trim(),
  query("color")
    .optional()
    .matches(/^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage("Invalid color format"),
  query("categories")
    .optional()
    .isArray()
    .withMessage("Categories must be an array"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),
];

router.get("/", auth, searchValidation, validateRequest, getHomeData);

module.exports = router;
