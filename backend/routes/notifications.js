const express = require('express');
const router = express.Router();
const {
  listNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require('../controllers/notificationsController');
const { protect } = require('../middleware/auth');
const { preventDemoDelete } = require('../middleware/demoGuard');

router.use(protect);

router.get('/', listNotifications);
router.put('/mark-all-read', markAllAsRead);
router.put('/:id/read', markAsRead);
router.delete('/:id', preventDemoDelete, deleteNotification);

module.exports = router;
