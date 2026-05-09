const Expense = require('../models/Expense');
const mongoose = require('mongoose');
const { asyncHandler } = require('../middleware/asyncHandler');
const { moveDocumentToTrash } = require('../utils/trash');

exports.listExpenses = asyncHandler(async (req, res) => {
  const { category, startDate, endDate, q, page = 1, limit = 20, status } = req.query;
  const filter = { company_id: req.user.company_id };

  if (q && q.trim()) {
    const search = { $regex: q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    filter.$or = [
      { title: search },
      { category: search },
      { note: search },
      { vendor_name: search },
      { custom_id: search }
    ];
  }

  // Role-based visibility
  const userRole = req.user.role;
  const userId = req.user.id;

  if (userRole === 'Employee') {
    filter.created_by = userId;
  } else if (userRole === 'Manager') {
    // Manager sees their own expenses + expenses of users reporting to them
    const teamMembers = await mongoose.model('User').find({ manager_id: userId }).select('_id');
    const teamIds = teamMembers.map(m => m._id);
    filter.$or = [
      { created_by: userId },
      { created_by: { $in: teamIds } }
    ];
  } else if (userRole === 'HR') {
    // HR sees "HR related" categories: Medical, Travel, Training, Internet, etc.
    // Or they see everything if they are also an Admin, but here we follow the spec
    filter.$or = [
      { created_by: userId },
      { category: { $in: ['Medical', 'Travel', 'Training', 'Internet', 'Wellness'] } }
    ];
  } else if (userRole === 'Accountant') {
    // Accountant sees all "Approved" expenses ready for payment + their own
    filter.$or = [
      { created_by: userId },
      { status: { $in: ['Approved', 'Completed', 'Failed'] } }
    ];
  }
  // Admin sees All (default filter already handles company_id)

  if (category) filter.category = category;
  if (status) filter.status = status;

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 20);

  const [items, total] = await Promise.all([
    Expense.find(filter)
      .populate('created_by', 'name role')
      .populate('paid_by', 'name role')
      .populate('approved_by', 'name role')
      .sort({ created_at: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Expense.countDocuments(filter)
  ]);

  res.ok({ items, total, page: pageNum, limit: limitNum });
});

async function generateCustomId(companyId) {
  const lastExpense = await Expense.findOne({ company_id: companyId }).sort({ created_at: -1 });
  let nextNum = 101;
  if (lastExpense && lastExpense.custom_id) {
    const parts = lastExpense.custom_id.split('-');
    if (parts.length === 2) {
      const num = parseInt(parts[1]);
      if (!isNaN(num)) nextNum = num + 1;
    }
  }
  return `EXP-${nextNum}`;
}

exports.createExpense = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  payload.company_id = req.user.company_id;
  payload.created_by = req.user.id;
  payload.custom_id = await generateCustomId(req.user.company_id);
  
  if (req.file) {
    payload.receipt_url = `/uploads/${req.file.filename}`;
  }

  const expense = await Expense.create(payload);
  res.created(expense);
});

exports.getExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.id, company_id: req.user.company_id })
    .populate('created_by', 'name role')
    .populate('paid_by', 'name role')
    .populate('approved_by', 'name role');
    
  if (!expense) return res.fail('Expense not found', 404);
  res.ok(expense);
});

exports.updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.id, company_id: req.user.company_id });
  if (!expense) return res.fail('Expense not found', 404);

  const userRole = req.user.role;
  const userId = req.user.id;
  const amount = expense.amount || 0;
  const isCorporate = ['Rent', 'Internet', 'Marketing', 'Electricity', 'Software', 'Utilities'].includes(expense.category);
  const isClaim = ['Travel', 'Medical', 'Training', 'Wellness', 'Other'].includes(expense.category);

  // RBAC: Employees can only edit their own PENDING expenses
  if (userRole === 'Employee') {
    if (String(expense.created_by) !== userId) {
      return res.fail('Unauthorized: You can only edit your own expense requests', 403);
    }
    if (expense.status !== 'Pending') {
      return res.fail('Unauthorized: Only pending requests can be modified', 403);
    }
  }

  // Handle status transitions
  if (req.body.status) {
    const newStatus = req.body.status;

    // APPROVAL LOGIC
    if (newStatus === 'Approved') {
      // 1. Mandatory Admin Approval for Large Amounts (> 50,000)
      if (amount > 50000 && userRole !== 'Admin') {
        return res.fail('Unauthorized: Expenses above ₹50,000 require Admin approval', 403);
      }

      // 2. Corporate Spend Approval (Admin Only)
      if (isCorporate && userRole !== 'Admin') {
        return res.fail('Unauthorized: Corporate expenses (Rent, Internet, etc.) can only be approved by Admin', 403);
      }

      // 3. Employee Claims Approval (Manager or Admin)
      if (isClaim && !['Admin', 'Manager', 'HR'].includes(userRole)) {
        return res.fail('Unauthorized: Claims must be approved by a Manager or Admin', 403);
      }

      req.body.approved_by = userId;
      req.body.approved_date = new Date();
    }

    // PAYMENT LOGIC (Accountant or Admin)
    if (newStatus === 'Completed') {
      if (!['Accountant', 'Admin'].includes(userRole)) {
        return res.fail('Unauthorized: Only Accountants or Admins can record payments', 403);
      }
      if (expense.status !== 'Approved') {
        return res.fail('Unauthorized: Expense must be approved before recording payment', 400);
      }
      req.body.payment_date = new Date();
      req.body.paid_by = userId;
    }

    // REJECTION LOGIC
    if (newStatus === 'Rejected') {
      if (!['Admin', 'Manager', 'HR'].includes(userRole)) {
        return res.fail('Unauthorized: Insufficient permissions to reject this expense', 403);
      }
      req.body.approved_by = userId;
      req.body.rejected_reason = req.body.rejected_reason || 'Rejected by ' + userRole;
    }
  }

  if (req.file) {
    req.body.receipt_url = `/uploads/${req.file.filename}`;
  }

  Object.assign(expense, req.body);
  await expense.save();

  res.ok(expense);
});

exports.deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.id, company_id: req.user.company_id });
  if (!expense) return res.fail('Expense not found', 404);

  // RBAC: Only Admin can delete expenses
  if (req.user.role !== 'Admin') {
    return res.fail('Unauthorized: Only administrators can delete expenses', 403);
  }

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
  const { category, startDate, endDate, status } = req.query;

  const filter = { company_id: req.user.company_id };
  if (category && category !== 'undefined' && category !== 'null') filter.category = category;
  if (status && status !== 'undefined' && status !== 'null') filter.status = status;

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  const expenses = await Expense.find(filter)
    .populate('created_by', 'name')
    .populate('paid_by', 'name')
    .populate('approved_by', 'name')
    .sort({ date: -1 });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Expenses Report');

  worksheet.columns = [
    { header: 'ID', key: 'id', width: 25 },
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Vendor', key: 'vendor', width: 20 },
    { header: 'Method', key: 'method', width: 15 },
    { header: 'Paid By', key: 'paid_by', width: 20 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Approved By', key: 'approved_by', width: 20 },
    { header: 'Note', key: 'note', width: 40 },
  ];

  expenses.forEach(exp => {
    worksheet.addRow({
      id: exp._id.toString(),
      title: exp.title || '',
      date: new Date(exp.date).toLocaleDateString(),
      category: exp.category,
      vendor: exp.vendor_name || '',
      method: exp.payment_method || '',
      paid_by: exp.paid_by?.name || '',
      amount: exp.amount || 0,
      status: exp.status || '',
      approved_by: exp.approved_by?.name || '',
      note: exp.note || '',
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="expenses-report.xlsx"');

  await workbook.xlsx.write(res);
  res.end();
});

