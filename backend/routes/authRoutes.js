
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// ADMIN LOGIN API
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required"
      });
    }

    const [admins] = await db.promise().execute(
      "SELECT * FROM admins WHERE username = ?",
      [username]
    );

    if (admins.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password"
      });
    }

    const admin = admins[0];

    const isPasswordCorrect = await bcrypt.compare(
      password,
      admin.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password"
      });
    }

    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      success: true,
      message: "Admin login successful",
      token,
      admin: {
        id: admin.id,
        username: admin.username
      }
    });

  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// VERIFY CURRENT ADMIN SESSION
router.get("/me", authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: "Admin session is valid",
    admin: req.admin
  });
});

module.exports = router;
