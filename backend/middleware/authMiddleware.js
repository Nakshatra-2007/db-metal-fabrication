
const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  // Get the token from the request header
  const authHeader = req.headers.authorization;

  // Check whether the token exists
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Access denied. Please login first."
    });
  }

  // Extract the actual token
  const token = authHeader.split(" ")[1];

  try {
    // Verify the token using our secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach admin details to the request
    req.admin = decoded;

    // Allow the request to continue
    next();

  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please login again."
    });
  }
}

module.exports = authMiddleware;
