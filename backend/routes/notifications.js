const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  listNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount
} = require('../controllers/notificationsController');

router.use(protect);

router.get('/', listNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/:id/read', markAsRead);
router.put('/mark-all-read', markAllAsRead);

module.exports = router;
