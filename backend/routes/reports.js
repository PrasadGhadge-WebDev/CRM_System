const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/sales', reportsController.getSalesReport);
router.get('/leads', reportsController.getLeadsReport);
router.get('/finance', reportsController.getFinanceReport);
router.get('/performance', reportsController.getEmployeePerformance);
router.get('/tickets', reportsController.getTicketReport);

module.exports = router;
