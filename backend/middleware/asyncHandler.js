/**
 * Error handling wrapper for async route handlers.
 * Ensures all errors are passed to the Express error handler.
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      // If 'next' is a valid function, use it to propagate the error
      if (typeof next === 'function') {
        return next(err);
      }

      // Fallback if 'next' is somehow unavailable
      console.error('[AsyncHandler] Unhandled error:', err);
      
      if (res && !res.headersSent) {
        const message = err?.message || 'Internal Server Error';
        const statusCode = err?.status || 500;
        
        if (typeof res.fail === 'function') {
          return res.fail(message, statusCode);
        }
        
        return res.status(statusCode).json({
          success: false,
          message: message
        });
      }
    });
  };
};

module.exports = { asyncHandler };
