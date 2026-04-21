const mongoose = require('mongoose');

function requireDb(req, res, next) {
  if (mongoose.connection.readyState === 1) return next();
  res.status(503).json({ message: 'Database not connected yet. Check MONGO_URI and MongoDB service.' });
}

module.exports = { requireDb };

