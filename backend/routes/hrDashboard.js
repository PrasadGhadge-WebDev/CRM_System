const express = require('express');
const router = express.Router();
const { getHRDashboard } = require('../controllers/hrDashboardController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('Admin', 'Manager', 'Employee')); // Assuming HR might fall under Admin or Manager in this CRM context

router.get('/', getHRDashboard);

module.exports = router;
