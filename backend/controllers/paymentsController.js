const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Counter = require('../models/Counter');
const mongoose = require('mongoose');
const { asyncHandler } = require('../middleware/asyncHandler');
const { moveDocumentToTrash } = require('../utils/trash');
const { syncCustomerFinancials, syncDealFinancials } = require('../utils/financialsSync');

async function getNextPaymentNumber(companyId) {
  const counter = await Counter.findOneAndUpdate(
    { company_id: companyId, model: 'Payment', field: 'paymentNumber' },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
  );
  if (!counter.prefix || counter.prefix === 'LD-') {
     counter.prefix = 'PAY-';
     await counter.save();
  }
  return `${counter.prefix}${counter.seq}`;
}

exports.listPayments = asyncHandler(async (req, res) => {
  const { 
    customer_id, 
    invoice_id, 
    deal_id, 
    payment_mode, 
    status,
    startDate, 
    endDate, 
    q, 
    page = 1, 
    limit = 20 
  } = req.query;

  // HR Role has NO access to Payments
  if (req.user.role === 'HR') {
    return res.fail('HR Personnel are not authorized to access financial payment data', 403);
  }

  const filter = { company_id: req.user.company_id };

  // Role-Based Visibility
  if (req.user.role === 'Employee') {
    // Employees see assigned customer payments, their own created payments, or payments they collected
    const Customer = require('../models/Customer');
    const assignedCustomers = await Customer.distinct('_id', { assigned_to: req.user.id, isDeleted: { $ne: true } });
    
    filter.$or = [
      { created_by: req.user.id },
      { collected_by: req.user.id },
      { customer_id: { $in: assignedCustomers } }
    ];
  } else if (req.user.role === 'Manager') {
    // Managers see everything for monitoring but can't delete
  }

  // Applied Filters
  if (customer_id) filter.customer_id = customer_id;
  if (invoice_id) filter.invoice_id = invoice_id;
  if (deal_id) filter.deal_id = deal_id;
  if (payment_mode) filter.payment_mode = payment_mode;
  if (status) filter.status = status;

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
      { payment_mode: search }
    ];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));

  const [items, totalFiltered, modeStats, statusStats] = await Promise.all([
    Payment.find(filter)
      .populate('customer_id', 'name')
      .populate('invoice_id', 'invoice_number total_amount paid_amount due_date status')
      .populate('deal_id', 'name')
      .populate('collected_by', 'name')
      .sort({ created_at: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Payment.countDocuments(filter),
    Payment.aggregate([
      { $match: filter },
      { $group: { _id: '$payment_mode', count: { $sum: 1 }, total: { $sum: '$paid_amount' } } }
    ]),
    Payment.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$paid_amount' } } }
    ])
  ]);

  const summary = {
    total: totalFiltered,
    totalCollection: 0,
    totalPending: 0,
    byMode: {},
    byStatus: {}
  };
  
  statusStats.forEach(s => {
    if (s._id) {
      summary.byStatus[s._id] = s.count;
      if (s._id === 'Paid' || s._id === 'Partial') {
        summary.totalCollection += s.total;
      }
    }
  });

  modeStats.forEach(s => {
    if (s._id) summary.byMode[s._id] = s.count;
  });

  // Calculate Global Pending from Invoices
  const pendingRes = await Invoice.aggregate([
    { $match: { company_id: req.user.company_id, status: { $ne: 'Paid' } } },
    { $group: { _id: null, total: { $sum: { $subtract: ['$total_amount', '$paid_amount'] } } } }
  ]);
  summary.totalPending = pendingRes[0]?.total || 0;

  // Today's Collection
  const startOfToday = new Date();
  startOfToday.setHours(0,0,0,0);
  const todayRes = await Payment.aggregate([
    { $match: { company_id: req.user.company_id, payment_date: { $gte: startOfToday }, status: { $in: ['Paid', 'Partial'] } } },
    { $group: { _id: null, total: { $sum: '$paid_amount' } } }
  ]);
  summary.todayCollection = todayRes[0]?.total || 0;

  res.ok({ items, total: totalFiltered, page: pageNum, limit: limitNum, summary });
});

exports.createPayment = asyncHandler(async (req, res) => {
  const payload = req.body;

  // Employee/HR block for creation
  if (['Employee', 'HR'].includes(req.user.role)) {
    return res.fail('You are not authorized to create payments. Please contact an Accountant or Admin.', 403);
  }

  payload.company_id = req.user.company_id;
  payload.created_by = req.user.id;
  payload.collected_by = payload.collected_by || req.user.id;

  if (!payload.payment_number) {
    payload.payment_number = await getNextPaymentNumber(req.user.company_id);
  }

  // Auto-calculate pending if not provided
  if (payload.total_amount && payload.paid_amount !== undefined) {
    payload.pending_amount = Math.max(0, payload.total_amount - payload.paid_amount);
  }

  try {
    const payment = await Payment.create(payload);

    // Sync with Invoice
    if (payment.invoice_id) {
      const invoice = await Invoice.findOne({ _id: payment.invoice_id, company_id: req.user.company_id });
      if (invoice) {
        // Add this payment to invoice's paid_amount
        invoice.paid_amount = (invoice.paid_amount || 0) + payment.paid_amount;
        
        if (invoice.paid_amount >= invoice.total_amount) {
          invoice.status = 'Paid';
          invoice.paid_date = new Date();
        } else if (invoice.paid_amount > 0) {
          invoice.status = 'Partially Paid';
        }
        
        await invoice.save();
        
        // If invoice is Paid and has a deal, close the deal
        if (invoice.status === 'Paid' && invoice.deal_id) {
          const Deal = require('../models/Deal');
          await Deal.findByIdAndUpdate(invoice.deal_id, { status: 'Closed', actual_close_date: new Date() });
        }
      }
    }

    // Sync with Deal
    if (payment.deal_id) {
      await syncDealFinancials(payment.deal_id, req.user.company_id);
    }

    res.created(payment);
  } catch (err) {
    console.error('[CreatePayment] Error:', err);
    res.fail(err.message || 'Payment creation failed', 500);
  }
});

exports.updatePayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.fail('Invalid payment ID format', 400);
  }

  // Employee/HR block for updates
  if (['Employee', 'HR'].includes(req.user.role)) {
    return res.fail('You are not authorized to modify payment records.', 403);
  }

  // Normalize object-based ids before validation
  if (updates.collected_by && typeof updates.collected_by === 'object') {
    updates.collected_by = updates.collected_by._id || updates.collected_by.id || ''
  }

  // Handle alias for payment_method -> payment_mode
  if (updates.payment_method && !updates.payment_mode) {
    updates.payment_mode = updates.payment_method;
  }

  // 1. Whitelist allowed fields
  const updateData = {};
  const allowedFields = [
    'payment_mode', 
    'status', 
    'notes', 
    'transaction_id', 
    'paid_amount', 
    'total_amount', 
    'payment_date',
    'collected_by'
  ];

  allowedFields.forEach(field => {
    if (updates[field] !== undefined) {
      updateData[field] = updates[field];
    }
  });

  // Handle auto-calculation for status if paid_amount/total_amount changed
  // Note: We duplicate some logic from the pre-save hook here because findOneAndUpdate bypasses it
  if (updateData.paid_amount !== undefined || updateData.total_amount !== undefined) {
    const p = await Payment.findById(id);
    if (p) {
      const paid = updateData.paid_amount !== undefined ? updateData.paid_amount : p.paid_amount;
      const total = updateData.total_amount !== undefined ? updateData.total_amount : p.total_amount;
      updateData.pending_amount = Math.max(0, total - paid);
      
      // Only auto-update status if it's currently in a flow state
      const flowStatuses = ['Pending', 'Partial', 'Paid'];
      if (flowStatuses.includes(updateData.status || p.status)) {
        if (paid >= total && total > 0) updateData.status = 'Paid';
        else if (paid > 0) updateData.status = 'Partial';
        else updateData.status = 'Pending';
      }
    }
  }

  try {
    // 2. Perform surgical update to avoid full document validation (avoids 400 errors on legacy data)
    const payment = await Payment.findOneAndUpdate(
      { _id: id, company_id: req.user.company_id },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!payment) return res.fail('Payment not found', 404);

    // 3. Sync Invoice Balance
    if (payment.invoice_id && mongoose.Types.ObjectId.isValid(payment.invoice_id)) {
      const invoice = await Invoice.findOne({ _id: payment.invoice_id, company_id: req.user.company_id });
      if (invoice) {
        const allPayments = await Payment.find({ 
          invoice_id: payment.invoice_id, 
          company_id: req.user.company_id,
          status: { $in: ['Paid', 'Partial'] } 
        });
        
        const newTotalPaid = allPayments.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
        invoice.paid_amount = newTotalPaid;
        
        if (invoice.paid_amount >= invoice.total_amount) {
          invoice.status = 'Paid';
          invoice.paid_date = invoice.paid_date || new Date();
        } else if (invoice.paid_amount > 0) {
          invoice.status = 'Partially Paid';
        } else {
          invoice.status = 'Unpaid';
        }
        
        // Use findOneAndUpdate for invoice too to bypass validation issues on legacy invoices
        await Invoice.findByIdAndUpdate(invoice._id, { 
          paid_amount: invoice.paid_amount,
          status: invoice.status,
          paid_date: invoice.paid_date
        });
      }
    }

    // 4. Sync Deal Balance
    if (payment.deal_id && mongoose.Types.ObjectId.isValid(payment.deal_id)) {
      await syncDealFinancials(payment.deal_id, req.user.company_id);
    }

    res.ok(payment);
  } catch (err) {
    console.error('[UpdatePayment] Critical Error:', err);
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors)[0].message;
      return res.fail(msg, 400);
    }
    if (err.name === 'CastError') {
      return res.fail(`Invalid ${err.path} format`, 400);
    }
    return res.fail(`Server Error: ${err.message}`, 500);
  }
});





exports.approvePayment = asyncHandler(async (req, res) => {
  if (!['Admin', 'Manager'].includes(req.user.role)) {
    return res.fail('Only Managers or Admins can approve payments', 403);
  }

  const payment = await Payment.findOne({ _id: req.params.id, company_id: req.user.company_id });
  if (!payment) return res.fail('Payment not found', 404);

  payment.approved_by = req.user.id;
  payment.status = 'Paid';
  await payment.save();

  res.ok(payment, 'Payment approved successfully');
});

exports.getPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ _id: req.params.id, company_id: req.user.company_id })
    .populate('customer_id', 'name email phone')
    .populate('invoice_id', 'invoice_number total_amount paid_amount status')
    .populate('deal_id', 'name status')
    .populate('collected_by', 'name');
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

  // Revert invoice amount if it was linked
  if (payment.invoice_id) {
    const invoice = await Invoice.findOne({ _id: payment.invoice_id, company_id: req.user.company_id });
    if (invoice) {
      invoice.paid_amount = Math.max(0, (invoice.paid_amount || 0) - payment.paid_amount);
      
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
    await syncCustomerFinancials(customerId, req.user.company_id, req.user.id);
  }

  // Step 4 & 5: Sync Deal Balance after deletion
  if (payment.deal_id) {
    await syncDealFinancials(payment.deal_id, req.user.company_id);
  }

  res.ok(null, 'Payment moved to trash');
});
