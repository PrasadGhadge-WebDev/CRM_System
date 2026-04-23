const express = require('express');
const controller = require('../controllers/demoController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/register', controller.registerDemo);
router.get('/users', protect, authorize('Admin'), controller.listDemoUsersForAdmin);

module.exports = router;
