const express = require('express');
const router = express.Router();
const { getAccountantDashboard } = require('../controllers/accountantDashboardController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('Admin', 'Accountant', 'Manager'));

router.get('/', getAccountantDashboard);

module.exports = router;
