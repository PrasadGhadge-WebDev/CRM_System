const express = require('express');
const router = express.Router();
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
router.use(authorize('Admin', 'Accountant', 'Manager'));

router.get('/reports', getExpenseReports);
router.get('/export', exportExpensesExcel);

router.route('/')
  .get(listExpenses)
  .post(createExpense);

router.route('/:id')
  .get(getExpense)
  .put(updateExpense)
  .delete(deleteExpense);

module.exports = router;
