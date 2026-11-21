
const express = require("express");
const router = express.Router();

const cloudinary = require("../config/cloudinary");
const upload = require("../middleware/uploadMiddleware");
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");

// Add a new project
router.post(
  "/",
  authMiddleware,
  upload.array("images", 10),
  async (req, res) => {
    let uploadedImages = [];

    try {
      const { description } = req.body;

      if (!description || !description.trim()) {
        return res.status(400).json({
          success: false,
          message: "Project description is required"
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Please upload at least one image"
        });
      }

      // Upload images to Cloudinary
      for (const file of req.files) {
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "db-metal-fabrication/projects",
              resource_type: "image"
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );

          stream.end(file.buffer);
        });

        uploadedImages.push(result);
      }

      // Save project description in MySQL
      const [projectResult] = await db.promise().execute(
        "INSERT INTO projects (description) VALUES (?)",
        [description.trim()]
      );

      const projectId = projectResult.insertId;

      // Save image URLs and Cloudinary IDs in MySQL
      for (const image of uploadedImages) {
        await db.promise().execute(
          `INSERT INTO project_images
           (project_id, image_url, public_id)
           VALUES (?, ?, ?)`,
          [projectId, image.secure_url, image.public_id]
        );
      }

      res.status(201).json({
        success: true,
        message: "Project uploaded successfully!",
        projectId: projectId,
        description: description.trim(),
        images: uploadedImages.map(image => image.secure_url)
      });

    } catch (error) {
      console.error("Project upload error:", error);

      // Clean up Cloudinary images if database saving fails
      for (const image of uploadedImages) {
        try {
          await cloudinary.uploader.destroy(image.public_id);
        } catch (cleanupError) {
          console.error("Image cleanup error:", cleanupError);
        }
      }

      res.status(500).json({
        success: false,
        message: "Project upload failed"
      });
    }
  }
);

// Get all projects with their images
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT
        p.id,
        p.description,
        p.created_at,
        pi.id AS image_id,
        pi.image_url
      FROM projects p
      LEFT JOIN project_images pi
        ON p.id = pi.project_id
      ORDER BY p.created_at DESC, pi.id ASC
    `);

    const projects = [];

    rows.forEach((row) => {
      let project = projects.find(
        (item) => item.id === row.id
      );

      if (!project) {
        project = {
          id: row.id,
          description: row.description,
          created_at: row.created_at,
          images: []
        };

        projects.push(project);
      }

      if (row.image_id) {
        project.images.push({
          id: row.image_id,
          image_url: row.image_url
        });
      }
    });

    res.json({
      success: true,
      projects: projects
    });

  } catch (error) {
    console.error("Fetch projects error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch projects"
    });
  }
});


// Edit an existing project and add more images
router.put(
  "/:id",
  authMiddleware,
  upload.array("images", 10),
  async (req, res) => {
    let uploadedImages = [];

    try {
      const projectId = req.params.id;
      const { description } = req.body;

      if (!description || !description.trim()) {
        return res.status(400).json({
          success: false,
          message: "Project description is required"
        });
      }

      // Check whether the project exists
      const [existingProjects] = await db.promise().execute(
        "SELECT id FROM projects WHERE id = ?",
        [projectId]
      );

      if (existingProjects.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      // Upload any newly selected images to Cloudinary
      for (const file of req.files || []) {
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "db-metal-fabrication/projects",
              resource_type: "image"
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );

          stream.end(file.buffer);
        });

        uploadedImages.push(result);
      }

      // Update the project description
      await db.promise().execute(
        "UPDATE projects SET description = ? WHERE id = ?",
        [description.trim(), projectId]
      );

      // Save newly uploaded image details
      for (const image of uploadedImages) {
        await db.promise().execute(
          `INSERT INTO project_images
           (project_id, image_url, public_id)
           VALUES (?, ?, ?)`,
          [projectId, image.secure_url, image.public_id]
        );
      }

      res.json({
        success: true,
        message: "Project updated successfully!"
      });

    } catch (error) {
      console.error("Project update error:", error);

      // Clean up newly uploaded images if saving fails
      for (const image of uploadedImages) {
        try {
          await cloudinary.uploader.destroy(image.public_id);
        } catch (cleanupError) {
          console.error("Image cleanup error:", cleanupError);
        }
      }

      res.status(500).json({
        success: false,
        message: "Project update failed"
      });
    }
  }
);

// Delete one photo from a project
router.delete(
  "/:projectId/images/:imageId",
  authMiddleware,
  async (req, res) => {
    try {
      const { projectId, imageId } = req.params;

      // Find the image and verify that it belongs to this project
      const [images] = await db.promise().execute(
        `SELECT id, public_id
         FROM project_images
         WHERE id = ? AND project_id = ?`,
        [imageId, projectId]
      );

      if (images.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Image not found in this project."
        });
      }

      const image = images[0];

      // Delete the actual image from Cloudinary
      const cloudinaryResult = await cloudinary.uploader.destroy(
        image.public_id
      );

      if (
        cloudinaryResult.result !== "ok" &&
        cloudinaryResult.result !== "not found"
      ) {
        throw new Error("Cloudinary image deletion failed.");
      }

      // Delete the image record from MySQL
      await db.promise().execute(
        "DELETE FROM project_images WHERE id = ?",
        [imageId]
      );

      res.json({
        success: true,
        message: "Photo deleted successfully!"
      });

    } catch (error) {
      console.error("Delete image error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to delete photo."
      });
    }
  }
);


// Delete an entire project and all its images
router.delete(
  "/:id",
  authMiddleware,
  async (req, res) => {
    try {
      const projectId = req.params.id;

      // Find the project
      const [projects] = await db.promise().execute(
        "SELECT id FROM projects WHERE id = ?",
        [projectId]
      );

      if (projects.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Project not found."
        });
      }

      // Get all Cloudinary image IDs belonging to this project
      const [images] = await db.promise().execute(
        "SELECT public_id FROM project_images WHERE project_id = ?",
        [projectId]
      );

      // Delete every image from Cloudinary
      for (const image of images) {
        const result = await cloudinary.uploader.destroy(
          image.public_id,
          { resource_type: "image" }
        );

        if (
          result.result !== "ok" &&
          result.result !== "not found"
        ) {
          throw new Error(
            `Failed to delete Cloudinary image: ${image.public_id}`
          );
        }
      }

      // Delete project from MySQL
      // ON DELETE CASCADE removes associated project_images rows
      await db.promise().execute(
        "DELETE FROM projects WHERE id = ?",
        [projectId]
      );

      res.json({
        success: true,
        message: "Project and all its images deleted successfully!"
      });

    } catch (error) {
      console.error("Delete project error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to delete project. Please try again."
      });
    }
  }
);


module.exports = router;
