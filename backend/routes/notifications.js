const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  listNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  markAsUnread,
  deleteNotification,
  togglePin
} = require('../controllers/notificationsController');

router.use(protect);

router.get('/', listNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/:id/read', markAsRead);
router.put('/:id/unread', markAsUnread);
router.put('/:id/pin', togglePin);
router.delete('/:id', deleteNotification);
router.put('/mark-all-read', markAllAsRead);

module.exports = router;
