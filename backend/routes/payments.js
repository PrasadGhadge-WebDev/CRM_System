const express = require('express');
const router = express.Router();
const {
  listPayments,
  createPayment,
  getPayment,
  deletePayment
} = require('../controllers/paymentsController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('Admin', 'Accountant', 'Manager'));

router.route('/')
  .get(listPayments)
  .post(createPayment);

router.route('/:id')
  .get(getPayment)
  .delete(deletePayment);

module.exports = router;
