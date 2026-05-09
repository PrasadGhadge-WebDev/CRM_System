const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const {
  listExpenses,
  createExpense,
  getExpense,
  updateExpense,
  deleteExpense,
  getExpenseReports,
  exportExpensesExcel
} = require('../controllers/expensesController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('Admin', 'Accountant', 'Manager', 'Employee'));

router.get('/reports', getExpenseReports);
router.get('/export', exportExpensesExcel);

router.route('/')
  .get(listExpenses)
  .post(upload.single('receipt'), createExpense);

router.route('/:id')
  .get(getExpense)
  .put(upload.single('receipt'), updateExpense)
  .delete(deleteExpense);

module.exports = router;
