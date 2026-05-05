const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Counter = require('../models/Counter');
const mongoose = require('mongoose');
const { asyncHandler } = require('../middleware/asyncHandler');
const { moveDocumentToTrash } = require('../utils/trash');

async function getNextPaymentNumber(companyId) {
  const counter = await Counter.findOneAndUpdate(
    { company_id: companyId, model: 'Payment', field: 'paymentNumber' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  if (!counter.prefix || counter.prefix === 'LD-') {
     counter.prefix = 'PAY-';
     await counter.save();
  }
  return `${counter.prefix}${counter.seq}`;
}

exports.listPayments = asyncHandler(async (req, res) => {
  const { customer_id, invoice_id, deal_id, payment_method, startDate, endDate, q, page = 1, limit = 20 } = req.query;

  const filter = { company_id: req.user.company_id };

  // Role-based filtering
  if (req.user.role === 'Employee') {
    // Only see payments linked to deals they are assigned to
    const Deal = require('../models/Deal');
    const myDeals = await Deal.find({ assigned_to: req.user.id, company_id: req.user.company_id }).select('_id');
    const myDealIds = myDeals.map(d => d._id);
    filter.deal_id = { $in: myDealIds };
  } else if (req.user.role === 'HR') {
    // HR generally sees all but maybe filter by specific criteria if needed
    // For now, let's allow them to see but they can only filter bank transfers
  } else if (req.user.role === 'Manager') {
    // Managers see everything to oversee the team
  } else if (req.user.role === 'Customer') {
    // Only see their own payments
    filter.customer_id = req.user.id; 
  }

  if (customer_id) filter.customer_id = customer_id;
  if (invoice_id) filter.invoice_id = invoice_id;
  if (deal_id) filter.deal_id = deal_id;
  if (payment_method) filter.payment_method = payment_method;

  if (startDate || endDate) {
    filter.payment_date = {};
    if (startDate) filter.payment_date.$gte = new Date(startDate);
    if (endDate) filter.payment_date.$lte = new Date(endDate);
  }

  if (q) {
    const search = { $regex: q, $options: 'i' };
    filter.$or = [
      { payment_number: search },
      { status: search },
      { notes: search },
      { transaction_id: search },
      { payment_method: search }
    ];
  }

  const summaryPipeline = [
    { $match: filter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ];

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));

  const [items, totalFiltered, methodStats, statusStats] = await Promise.all([
    Payment.find(filter)
      .populate('customer_id', 'name')
      .populate('invoice_id', 'invoice_number')
      .populate('approved_by', 'name')
      .sort({ created_at: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Payment.countDocuments(filter),
    Payment.aggregate([
      { $match: filter },
      { $group: { _id: '$payment_method', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
    ]),
    Payment.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
    ])
  ]);

  const summary = {
    total: totalFiltered,
    totalAmount: 0,
    byMethod: {},
    byStatus: {},
    bankTransferVolume: 0
  };
  
  methodStats.forEach(s => {
    if (s._id) {
      summary.byMethod[s._id] = s.count;
      summary.totalAmount += (s.totalAmount || 0);
    }
  });

  statusStats.forEach(s => {
    if (s._id) {
      summary.byStatus[s._id] = s.count;
    }
  });

  // Specifically for Admin/Manager: Bank Transfer Volume
  const bankStats = await Payment.aggregate([
    { $match: { ...filter, payment_method: 'Bank Transfer' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  summary.bankTransferVolume = bankStats[0]?.total || 0;

  res.ok({ items, total: totalFiltered, page: pageNum, limit: limitNum, summary });
});

exports.createPayment = asyncHandler(async (req, res) => {
  // Only Admin and Accountant can create payments
  if (!['Admin', 'Accountant'].includes(req.user.role)) {
    return res.fail('Unauthorized to create payments', 403);
  }

  const payload = req.body;
  payload.company_id = req.user.company_id;
  payload.created_by = req.user.id;

  if (!payload.payment_number) {
    payload.payment_number = await getNextPaymentNumber(req.user.company_id);
  }

  // High-value check
  if (payload.amount > 50000 && !payload.approved_by && req.user.role !== 'Admin') {
    payload.status = 'Pending'; // Needs Manager approval
  } else if (!payload.status) {
    payload.status = 'Completed';
  }

  const payment = await Payment.create(payload);

  // If linked to invoice, update it
  if (payment.invoice_id && payment.status === 'Completed') {
    const invoice = await Invoice.findOne({ _id: payment.invoice_id, company_id: req.user.company_id });
    if (invoice) {
      invoice.paid_amount = (invoice.paid_amount || 0) + payment.amount;
      if (invoice.paid_amount >= invoice.total_amount) {
        invoice.status = 'Paid';
        invoice.paid_date = new Date();
      } else {
        invoice.status = 'Partially Paid';
      }
      await invoice.save();

      // Log Invoice Update
      const { logActivity } = require('../utils/activityLogger');
      await logActivity({
        company_id: req.user.company_id,
        created_by: req.user.id,
        activity_type: 'Payment Applied',
        description: `Payment of ₹${payment.amount} applied to Invoice #${invoice.invoice_number}`,
        related_to: invoice._id,
        related_type: 'Invoice'
      });
    }
  }

  res.created(payment);
});

exports.updatePayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const payment = await Payment.findOne({ _id: id, company_id: req.user.company_id });
  if (!payment) return res.fail('Payment not found', 404);

  const oldStatus = payment.status;
  const oldAmount = payment.amount;
  const oldInvoiceId = payment.invoice_id;

  // Apply updates
  Object.assign(payment, updates);

  // If status changed to Completed and wasn't before, update invoice
  if (payment.status === 'Completed' && oldStatus !== 'Completed' && payment.invoice_id) {
    const invoice = await Invoice.findOne({ _id: payment.invoice_id, company_id: req.user.company_id });
    if (invoice) {
      invoice.paid_amount = (invoice.paid_amount || 0) + payment.amount;
      if (invoice.paid_amount >= invoice.total_amount) {
        invoice.status = 'Paid';
        invoice.paid_date = new Date();
      } else {
        invoice.status = 'Partially Paid';
      }
      await invoice.save();
    }
  }

  // If invoice_id was linked (fixed UNLINKED BILL)
  if (payment.invoice_id && !oldInvoiceId && payment.status === 'Completed') {
     const invoice = await Invoice.findOne({ _id: payment.invoice_id, company_id: req.user.company_id });
     if (invoice) {
       invoice.paid_amount = (invoice.paid_amount || 0) + payment.amount;
       await invoice.save();
     }
  }

  await payment.save();
  res.ok(payment);
});

exports.approvePayment = asyncHandler(async (req, res) => {
  if (!['Admin', 'Manager'].includes(req.user.role)) {
    return res.fail('Only Managers or Admins can approve payments', 403);
  }

  const payment = await Payment.findOne({ _id: req.params.id, company_id: req.user.company_id });
  if (!payment) return res.fail('Payment not found', 404);

  payment.approved_by = req.user.id;
  payment.status = 'Completed'; // Auto-complete on approval
  await payment.save();

  // Update Invoice
  if (payment.invoice_id) {
    const invoice = await Invoice.findOne({ _id: payment.invoice_id, company_id: req.user.company_id });
    if (invoice) {
      invoice.paid_amount = (invoice.paid_amount || 0) + payment.amount;
      if (invoice.paid_amount >= invoice.total_amount) {
        invoice.status = 'Paid';
        invoice.paid_date = new Date();
      } else {
        invoice.status = 'Partially Paid';
      }
      await invoice.save();
    }
  }

  res.ok(payment, 'Payment approved successfully');
});

exports.getPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ _id: req.params.id, company_id: req.user.company_id })
    .populate('customer_id', 'name email')
    .populate('invoice_id', 'invoice_number total_amount paid_amount')
    .populate('deal_id', 'name')
    .populate('received_by', 'name')
    .populate('approved_by', 'name');
  if (!payment) return res.fail('Payment not found', 404);
  res.ok(payment);
});

exports.deletePayment = asyncHandler(async (req, res) => {
  // Only Admin can delete payments
  if (req.user.role !== 'Admin') {
    return res.fail('Only Administrators can delete payment records', 403);
  }

  const payment = await Payment.findOne({ _id: req.params.id, company_id: req.user.company_id });
  if (!payment) return res.fail('Payment not found', 404);

  // Revert invoice amount if it was completed
  if (payment.invoice_id && payment.status === 'Completed') {
    const invoice = await Invoice.findOne({ _id: payment.invoice_id, company_id: req.user.company_id });
    if (invoice) {
      invoice.paid_amount = Math.max(0, (invoice.paid_amount || 0) - payment.amount);
      if (invoice.paid_amount === 0) {
        invoice.status = 'Unpaid';
      } else if (invoice.paid_amount < invoice.total_amount) {
        invoice.status = 'Partially Paid';
      }
      await invoice.save();
    }
  }

  const customerId = payment.customer_id;
  await moveDocumentToTrash({ entityType: 'payment', document: payment, deletedBy: req.user.id });

  // Step 4 & 5: Sync Financials after deletion
  if (customerId) {
    const { syncCustomerFinancials } = require('../utils/financialsSync');
    await syncCustomerFinancials(customerId, req.user.company_id, req.user.id);
  }

  res.ok(null, 'Payment moved to trash');
});
