const logger = require('../utils/logger');

function notFound(req, res, next) {
  res.status(404);
  next(new Error(`Not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || 'Server error';

  // Handle Mongoose errors
  if (err.name === 'CastError') {
    statusCode = 404;
    message = 'Resource not found with invalid ID';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((val) => val.message).join(', ');
  }
  
  logger.error(`API Error: ${message}`, {
    url: req.originalUrl,
    method: req.method,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });

  // Use res.fail if available (added by apiResponse middleware)
  if (typeof res.fail === 'function') {
    return res.fail(message, statusCode);
  }

  res.status(statusCode).json({
    success: false,
    message,
    data: null,
    ...(process.env.NODE_ENV === 'production' ? null : { stack: err.stack })
  });
}

module.exports = { notFound, errorHandler };
