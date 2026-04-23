const errorHandler = (err, req, res, next) => {
  console.error("❌ Error:", err.message);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res
      .status(400)
      .json({ success: false, message: messages.join(", ") });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res
      .status(400)
      .json({ success: false, message: `${field} already exists` });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }

  // Multer errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res
      .status(400)
      .json({ success: false, message: "File too large (max 10MB)" });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;