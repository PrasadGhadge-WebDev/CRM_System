const Lead = require('../models/Lead');
const Deal = require('../models/Deal');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const SupportTicket = require('../models/SupportTicket');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/asyncHandler');
const mongoose = require('mongoose');

// Helper to get date range
const getDateRange = (range, start, end) => {
  let startDate = new Date();
  let endDate = new Date();

  if (range === 'today') {
    startDate.setHours(0, 0, 0, 0);
  } else if (range === 'week') {
    startDate.setDate(startDate.getDate() - 7);
  } else if (range === 'month') {
    startDate.setMonth(startDate.getMonth() - 1);
  } else if (range === 'custom' && start && end) {
    startDate = new Date(start);
    endDate = new Date(end);
  } else {
    startDate.setMonth(startDate.getMonth() - 1); // Default to last month
  }
  return { startDate, endDate };
};

exports.getSalesReport = asyncHandler(async (req, res) => {
  const { range, start, end, userId } = req.query;
  const { startDate, endDate } = getDateRange(range, start, end);
  const filter = { 
    company_id: req.user.company_id,
    created_at: { $gte: startDate, $lte: endDate }
  };

  // Role-based filtering
  if (req.user.role === 'Employee') filter.assigned_to = req.user.id;
  if (req.user.role === 'Manager') {
    const team = await User.find({ manager_id: req.user.id }).select('_id');
    filter.assigned_to = { $in: [req.user.id, ...team.map(u => u._id)] };
  }
  if (userId) filter.assigned_to = userId;

  const stats = await Deal.aggregate([
    { $match: filter },
    { $group: {
      _id: '$status',
      count: { $sum: 1 },
      totalValue: { $sum: '$value' }
    }}
  ]);

  const trends = await Deal.aggregate([
    { $match: filter },
    { $group: {
      _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
      revenue: { $sum: { $cond: [{ $eq: ["$status", "Won"] }, "$value", 0] } },
      count: { $sum: 1 }
    }},
    { $sort: { "_id": 1 } }
  ]);

  res.ok({ stats, trends });
});

exports.getLeadsReport = asyncHandler(async (req, res) => {
  const { range, start, end, userId } = req.query;
  const { startDate, endDate } = getDateRange(range, start, end);
  const filter = { 
    company_id: req.user.company_id,
    created_at: { $gte: startDate, $lte: endDate }
  };

  if (req.user.role === 'Employee') filter.assigned_to = req.user.id;
  if (req.user.role === 'Manager') {
    const team = await User.find({ manager_id: req.user.id }).select('_id');
    filter.assigned_to = { $in: [req.user.id, ...team.map(u => u._id)] };
  }
  if (userId) filter.assigned_to = userId;

  const statusBreakdown = await Lead.aggregate([
    { $match: filter },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const sourceBreakdown = await Lead.aggregate([
    { $match: filter },
    { $group: { _id: '$source', count: { $sum: 1 } } }
  ]);

  res.ok({ statusBreakdown, sourceBreakdown });
});

exports.getFinanceReport = asyncHandler(async (req, res) => {
  if (!['Admin', 'Accountant'].includes(req.user.role)) {
    return res.fail('Unauthorized access to finance reports', 403);
  }

  const { range, start, end } = req.query;
  const { startDate, endDate } = getDateRange(range, start, end);
  
  // Base filter for payments and expenses
  const paymentFilter = { 
    company_id: req.user.company_id,
    payment_date: { $gte: startDate, $lte: endDate }
  };
  
  const expenseFilter = {
    company_id: req.user.company_id,
    date: { $gte: startDate, $lte: endDate }
  };

  const paymentStats = await Payment.aggregate([
    { $match: paymentFilter },
    { $group: { _id: '$status', total: { $sum: '$paid_amount' }, count: { $sum: 1 } } }
  ]);

  const expenseStats = await Expense.aggregate([
    { $match: expenseFilter },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }
  ]);

  const revenueTrend = await Payment.aggregate([
    { $match: { ...paymentFilter, status: 'Paid', payment_type: { $ne: 'internal' } } },
    { $group: {
      _id: { $dateToString: { format: "%Y-%m-%d", date: "$payment_date" } },
      total: { $sum: '$paid_amount' }
    }},
    { $sort: { "_id": 1 } }
  ]);

  res.ok({ paymentStats, expenseStats, revenueTrend });
});

exports.getEmployeePerformance = asyncHandler(async (req, res) => {
  const { range, start, end, userId } = req.query;
  const { startDate, endDate } = getDateRange(range, start, end);
  
  let userFilter = { company_id: req.user.company_id };
  if (req.user.role === 'Employee') userFilter._id = req.user.id;
  if (req.user.role === 'Manager') {
    const team = await User.find({ manager_id: req.user.id }).select('_id');
    userFilter._id = { $in: [req.user.id, ...team.map(u => u._id)] };
  }
  if (userId) userFilter._id = userId;

  const users = await User.find(userFilter).select('name role');
  const performance = await Promise.all(users.map(async (u) => {
    const leadCount = await Lead.countDocuments({ assigned_to: u._id, created_at: { $gte: startDate, $lte: endDate } });
    const wonDeals = await Deal.countDocuments({ assigned_to: u._id, status: 'Won', created_at: { $gte: startDate, $lte: endDate } });
    const totalRevenue = await Deal.aggregate([
      { $match: { assigned_to: u._id, status: 'Won', created_at: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: null, total: { $sum: '$value' } } }
    ]);

    return {
      userId: u._id,
      name: u.name,
      role: u.role,
      leads: leadCount,
      deals: wonDeals,
      revenue: totalRevenue[0]?.total || 0
    };
  }));

  res.ok(performance);
});

exports.getTicketReport = asyncHandler(async (req, res) => {
  const { range, start, end } = req.query;
  const { startDate, endDate } = getDateRange(range, start, end);
  const filter = { 
    company_id: req.user.company_id,
    created_at: { $gte: startDate, $lte: endDate }
  };

  const stats = await SupportTicket.aggregate([
    { $match: filter },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const priorityBreakdown = await SupportTicket.aggregate([
    { $match: filter },
    { $group: { _id: '$priority', count: { $sum: 1 } } }
  ]);

  res.ok({ stats, priorityBreakdown });
});
