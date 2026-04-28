const Expense = require('../models/Expense');
const mongoose = require('mongoose');
const { asyncHandler } = require('../middleware/asyncHandler');
const { moveDocumentToTrash } = require('../utils/trash');

exports.listExpenses = asyncHandler(async (req, res) => {
  const { category, startDate, endDate, page = 1, limit = 20 } = req.query;

  const filter = { company_id: req.user.company_id };
  if (category) filter.category = category;

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 20);

  const [items, total] = await Promise.all([
    Expense.find(filter)
      .sort({ date: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Expense.countDocuments(filter)
  ]);

  res.ok({ items, total, page: pageNum, limit: limitNum });
});

exports.createExpense = asyncHandler(async (req, res) => {
  const payload = req.body;
  payload.company_id = req.user.company_id;
  payload.created_by = req.user.id;

  const expense = await Expense.create(payload);
  res.created(expense);
});

exports.getExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.id, company_id: req.user.company_id });
  if (!expense) return res.fail('Expense not found', 404);
  res.ok(expense);
});

exports.updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOneAndUpdate(
    { _id: req.params.id, company_id: req.user.company_id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!expense) return res.fail('Expense not found', 404);
  res.ok(expense);
});

exports.deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.id, company_id: req.user.company_id });
  if (!expense) return res.fail('Expense not found', 404);

  await moveDocumentToTrash({ entityType: 'expense', document: expense, deletedBy: req.user.id });
  res.ok(null, 'Expense moved to trash');
});

exports.getExpenseReports = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const filter = { company_id: req.user.company_id };
  
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  const report = await Expense.aggregate([
    { $match: filter },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } }
  ]);

  res.ok(report);
});

exports.exportExpensesExcel = asyncHandler(async (req, res) => {
  const ExcelJS = require('exceljs');
  const { category, startDate, endDate } = req.query;

  const filter = { company_id: req.user.company_id };
  if (category && category !== 'undefined' && category !== 'null') filter.category = category;

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  const expenses = await Expense.find(filter).sort({ date: -1 });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Expenses Report');

  worksheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Tax Amount', key: 'tax_amount', width: 15 },
    { header: 'Total Amount', key: 'total_amount', width: 15 },
  ];

  expenses.forEach(exp => {
    worksheet.addRow({
      date: new Date(exp.date).toLocaleDateString(),
      category: exp.category,
      description: exp.note || '',
      tax_amount: exp.tax_amount || 0,
      total_amount: exp.amount || 0,
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="expenses-report.xlsx"');

  await workbook.xlsx.write(res);
  res.end();
});

