const express = require('express');
const router = express.Router();
const {
  listPayments,
  createPayment,
  getPayment,
  updatePayment,
  approvePayment,
  deletePayment
} = require('../controllers/paymentsController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(authorize('Admin', 'Accountant', 'Manager', 'HR', 'Employee'), listPayments)
  .post(authorize('Admin', 'Accountant'), createPayment);

router.route('/:id')
  .get(authorize('Admin', 'Accountant', 'Manager', 'HR', 'Employee'), getPayment)
  .patch(authorize('Admin', 'Accountant'), updatePayment)
  .delete(authorize('Admin'), deletePayment);

router.post('/:id/approve', authorize('Admin', 'Manager'), approvePayment);

module.exports = router;
