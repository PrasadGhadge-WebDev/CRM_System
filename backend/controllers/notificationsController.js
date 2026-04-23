const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/asyncHandler');
const mongoose = require('mongoose');

exports.listNotifications = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20, unreadOnly = false } = req.query;
  
  const query = { 
    user_id: new mongoose.Types.ObjectId(req.user.id),
    isDeleted: { $ne: true }
  };
  
  if (unreadOnly === 'true') {
    query.is_read = false;
  }

  const items = await Notification.find(query)
    .sort({ created_at: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Notification.countDocuments(query);
  const unreadCount = await Notification.countDocuments({ ...query, is_read: false });

  res.ok({
    items,
    total,
    unreadCount,
    page: Number(page),
    limit: Number(limit)
  });
});

exports.markAsRead = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const notification = await Notification.findOneAndUpdate(
    { _id: id, user_id: req.user.id },
    { is_read: true },
    { new: true }
  );

  if (!notification) {
    return res.fail('Notification not found', 404);
  }

  res.ok(notification);
});

exports.markAllAsRead = asyncHandler(async (req, res, next) => {
  await Notification.updateMany(
    { user_id: req.user.id, is_read: false },
    { is_read: true }
  );

  res.ok(null, 'All notifications marked as read');
});

exports.getUnreadCount = asyncHandler(async (req, res, next) => {
  const count = await Notification.countDocuments({
    user_id: req.user.id,
    is_read: false,
    isDeleted: { $ne: true }
  });
  res.ok({ count });
});
