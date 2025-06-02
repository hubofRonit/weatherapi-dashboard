// server/middleware/errorHandler.js
import config from '../config/index.js';

const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error); // Pass the error to the next middleware (errorHandler)
};

const errorHandler = (err, req, res, next) => {
  // Sometimes errors come with status codes, otherwise default to 500
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);

  console.error("Error Handler Caught:", err.stack); // Log the full error stack

  res.json({
    message: err.message,
    // Provide stack trace only in development mode for security reasons
    stack: config.env === 'development' ? err.stack : null,
  });
};

export { notFound, errorHandler };