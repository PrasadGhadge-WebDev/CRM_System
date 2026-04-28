const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const { asyncHandler } = require('../middleware/asyncHandler');

exports.getAccountantDashboard = asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    todayPayments,
    todayInvoices,
    pendingInvoices,
    monthlyPayments,
    expenseStats,
    recentPayments,
    recentInvoices
  ] = await Promise.all([
    // Today's payments received
    Payment.aggregate([
      { $match: { company_id: companyId, payment_date: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]),
    // Today's invoices generated
    Invoice.aggregate([
      { $match: { company_id: companyId, invoice_date: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: '$total_amount' }, count: { $sum: 1 } } }
    ]),
    // Pending payments total
    Invoice.aggregate([
      { $match: { company_id: companyId, status: { $nin: ['Paid', 'Cancelled'] } } },
      { $group: { _id: null, total: { $sum: { $subtract: ['$total_amount', '$paid_amount'] } } } }
    ]),
    // Monthly revenue chart (last 6 months)
    Payment.aggregate([
      { 
        $match: { 
          company_id: companyId, 
          payment_date: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) } 
        } 
      },
      {
        $group: {
          _id: { month: { $month: '$payment_date' }, year: { $year: '$payment_date' } },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]),
    // Expense pie chart (last 30 days)
    Expense.aggregate([
      { 
        $match: { 
          company_id: companyId, 
          date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } 
        } 
      },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } }
    ]),
    // Recent Payments
    Payment.find({ company_id: companyId })
      .populate('customer_id', 'name')
      .sort({ payment_date: -1 })
      .limit(5),
    // Recent Invoices
    Invoice.find({ company_id: companyId })
      .populate('customer_id', 'name')
      .sort({ invoice_date: -1 })
      .limit(5)
  ]);

  res.ok({
    today: {
      payments: todayPayments[0] || { total: 0, count: 0 },
      invoices: todayInvoices[0] || { total: 0, count: 0 }
    },
    pendingTotal: pendingInvoices[0]?.total || 0,
    monthlyRevenue: monthlyPayments.map(m => ({
      label: `${m._id.month}/${m._id.year}`,
      value: m.total
    })),
    expenses: expenseStats.map(e => ({
      label: e._id,
      value: e.total
    })),
    recent: {
      payments: recentPayments,
      invoices: recentInvoices
    }
  });
});
