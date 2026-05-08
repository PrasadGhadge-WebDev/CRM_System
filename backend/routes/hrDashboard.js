const express = require('express');
const router = express.Router();
const { getHRDashboard } = require('../controllers/hrDashboardController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('Admin', 'Manager', 'Employee', 'HR'));

router.get('/', getHRDashboard);

module.exports = router;
