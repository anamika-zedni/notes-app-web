const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  register,
  login,
  logout,
  getMe,
  resetPassword,
} = require("../controllers/authController");
const validateRequest = require("../middleware/validateRequest");
const auth = require("../middleware/auth");

// Validation rules for registration
const registerValidation = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[A-Za-z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers and underscores"),

  body("email")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please enter a valid email"),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  // .matches(/\d/)
  // .withMessage('Password must contain at least one number')
  // .matches(/[A-Z]/)
  // .withMessage('Password must contain at least one uppercase letter')
];

const loginValidation = [
  body("email").trim().notEmpty().withMessage("Email or username is required"),

  body("password").exists().withMessage("Password is required"),
];

const resetPasswordValidation = [
  body("oldPassword").exists().withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters long"),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error("Passwords do not match");
    }
    return true;
  }),
];

const forgotPasswordValidation = [
  body("email")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please enter a valid email"),
];

const resetPasswordTokenValidation = [
  body("token").notEmpty().withMessage("Reset token is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

router.post("/register", registerValidation, validateRequest, register);
router.post("/login", loginValidation, validateRequest, login);
router.post("/logout", auth, logout);
router.get("/me", auth, getMe);
router.post(
  "/reset-password",
  auth,
  resetPasswordValidation,
  validateRequest,
  resetPassword
);


module.exports = router;