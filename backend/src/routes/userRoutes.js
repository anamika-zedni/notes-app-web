const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/auth");

// Route to fetch users with a single query for username or email
router.get("/", async (req, res) => {
  try {
    const { query } = req.query;

    const searchQuery = query
      ? {
          $or: [
            { username: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
          ],
        }
      : {};

    // Fetch users and transform the response
    const users = await User.find(searchQuery)
      .select("_id username email")
      .lean()
      .then(users => users.map(user => ({
        id: user._id,
        username: user.username,
        email: user.email
      })));

    res.json({
      success: true,
      message: "Users retrieved successfully",
      users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      errors: {
        server: "Error fetching users",
      },
    });
  }
});

module.exports = router;