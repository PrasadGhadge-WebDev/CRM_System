const express = require('express');
const router = express.Router();
const {
  listInvoices,
  createInvoice,
  getInvoice,
  updateInvoice,
  deleteInvoice,
  generateInvoiceFromDeal,
  logInvoiceAction
} = require('../controllers/invoicesController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Action tracking (Available to all who can view)
router.post('/:id/log-action', authorize('Admin', 'Accountant', 'Manager', 'Employee', 'Customer'), logInvoiceAction);

// Generation from Deal (Accountant/Admin)
router.post('/generate-from-deal', authorize('Admin', 'Accountant'), generateInvoiceFromDeal);

// Standard CRUD
router.route('/')
  .get(authorize('Admin', 'Accountant', 'Manager', 'Employee', 'Customer'), listInvoices)
  .post(authorize('Admin', 'Accountant'), createInvoice);

router.route('/:id')
  .get(authorize('Admin', 'Accountant', 'Manager', 'Employee', 'Customer'), getInvoice)
  .put(authorize('Admin', 'Accountant'), updateInvoice)
  .delete(authorize('Admin'), deleteInvoice);

module.exports = router;
