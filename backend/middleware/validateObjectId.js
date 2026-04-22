const mongoose = require('mongoose');

function validateObjectId(paramName = 'id') {
  return (req, res, next) => {
    const value = typeof req.params[paramName] === 'string' ? req.params[paramName].trim() : req.params[paramName];
    if (!value) return next();
    if (!mongoose.Types.ObjectId.isValid(value)) {
      res.status(400);
      return next(new Error(`Invalid id: ${paramName}`));
    }
    return next();
  };
}

module.exports = { validateObjectId };

