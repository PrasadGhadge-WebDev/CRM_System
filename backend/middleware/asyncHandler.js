const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    if (typeof next === 'function') {
      next(err);
    } else {
      console.error('asyncHandler: next is not a function', err);
      // Fallback for Express 5 if next was lost
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: err.message || 'Server Error' });
      }
    }
  });

module.exports = { asyncHandler };
