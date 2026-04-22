const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    // If next is a function, use it as intended
    if (typeof next === 'function') {
      return next(err);
    }

    // Fallback: log the error and send a JSON response directly
    console.error('[AsyncHandler] Unhandled error (next is not a function):', err);
    
    if (res?.headersSent) return;

    const message = err?.message || 'Server Error';
    if (typeof res?.fail === 'function') {
      return res.fail(message, 500);
    }

    return res.status(500).json({ success: false, message });
  });


module.exports = { asyncHandler };
