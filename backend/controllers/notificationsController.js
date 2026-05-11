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
    .sort({ is_pinned: -1, created_at: -1 })
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
    { is_read: true, read_at: Date.now() },
    { new: true }
  );

  if (!notification) {
    return res.fail('Notification not found', 404);
  }

  res.ok(notification);
});

exports.markAsUnread = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const notification = await Notification.findOneAndUpdate(
    { _id: id, user_id: req.user.id },
    { is_read: false, read_at: null },
    { new: true }
  );

  if (!notification) {
    return res.fail('Notification not found', 404);
  }

  res.ok(notification);
});

exports.deleteNotification = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const notification = await Notification.findOneAndDelete({ 
    _id: id, 
    user_id: req.user.id 
  });

  if (!notification) {
    return res.fail('Notification not found', 404);
  }

  res.ok(null, 'Notification deleted');
});

exports.togglePin = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const note = await Notification.findOne({ _id: id, user_id: req.user.id });
  
  if (!note) return res.fail('Notification not found', 404);
  
  note.is_pinned = !note.is_pinned;
  await note.save();

  res.ok(note);
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
