
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./config/db");

const app = express();
const authRoutes = require("./routes/authRoutes");

const authMiddleware = require("./middleware/authMiddleware");

const projectRoutes = require("./routes/projectRoutes");

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);

// Home route
app.get("/", (req, res) => {
  res.send("DB Metal Fabrication Backend is running!");
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend is working successfully!"
  });
});

// Database connection test
app.get("/api/db-test", (req, res) => {
  db.query("SELECT DATABASE() AS database_name", (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({
        success: false,
        message: "Database connection failed"
      });
    }

    res.json({
      success: true,
      message: "MySQL connected successfully!",
      database: results[0].database_name
    });
  });
});

// Protected admin test route
app.get("/api/admin/test", authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: "Welcome Admin! You have accessed a protected route.",
    admin: req.admin
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

server.on("close", () => {
  console.log("Express server has closed!");
});

server.on("error", (error) => {
  console.error("Server error:", error);
});
