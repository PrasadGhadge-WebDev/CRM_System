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
  const { customer_id, invoice_id, deal_id, payment_method, startDate, endDate, page = 1, limit = 20 } = req.query;

  const filter = { company_id: req.user.company_id };

  // Role-based filtering
  if (req.user.role === 'Employee') {
    // Only see payments linked to deals they are assigned to
    const Deal = require('../models/Deal');
    const myDeals = await Deal.find({ assigned_to: req.user.id, company_id: req.user.company_id }).select('_id');
    const myDealIds = myDeals.map(d => d._id);
    filter.deal_id = { $in: myDealIds };
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

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 20);

  const [items, total] = await Promise.all([
    Payment.find(filter)
      .populate('customer_id', 'name')
      .populate('invoice_id', 'invoice_number')
      .sort({ created_at: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Payment.countDocuments(filter)
  ]);

  res.ok({ items, total, page: pageNum, limit: limitNum });
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

  // Rule 1: No Payment without Invoice
  if (!payload.invoice_id && !payload.deal_id) {
    return res.fail('Business Rule Violation: Payments must be linked to an Invoice.', 400);
  }

  // Auto-find invoice if deal_id is provided but invoice_id is not
  if (payload.deal_id && !payload.invoice_id) {
    const Invoice = require('../models/Invoice');
    const invoice = await Invoice.findOne({ deal_id: payload.deal_id, company_id: req.user.company_id });
    if (!invoice) return res.fail('No Bill found for this Deal. Please generate an invoice first.', 400);
    payload.invoice_id = invoice._id;
  }

  // Final check for Invoice ID
  if (!payload.invoice_id) return res.fail('Invoice ID is required for every payment.', 400);

  const Invoice = require('../models/Invoice');
  const invoice = await Invoice.findOne({ _id: payload.invoice_id, company_id: req.user.company_id });
  if (!invoice) return res.fail('Invoice not found', 404);

  // Determine Payment Status (Rule 2 & 5)
  const remainingBefore = invoice.total_amount - (invoice.paid_amount || 0);
  if (payload.amount >= remainingBefore) {
    payload.status = 'Paid';
  } else {
    payload.status = 'Partial';
  }

  const payment = await Payment.create(payload);

  // Update Invoice (Rule 3 & 4)
  invoice.paid_amount = (invoice.paid_amount || 0) + payload.amount;
  
  if (invoice.paid_amount >= invoice.total_amount) {
    invoice.status = 'Paid';
    invoice.paid_date = new Date();
  } else if (invoice.paid_amount > 0) {
    invoice.status = 'Partially Paid';
    invoice.paid_date = null;
  }
  
  await invoice.save();

  // Step 7: Update Deal to Completed if Invoice is fully Paid
  if (invoice.status === 'Paid' && invoice.deal_id) {
    const Deal = require('../models/Deal');
    await Deal.findOneAndUpdate(
      { _id: invoice.deal_id, company_id: req.user.company_id },
      { status: 'Completed' }
    );
  }
  
  const { logActivity } = require('../utils/activityLogger');

  // Log Invoice Status Change
  await logActivity({
    company_id: req.user.company_id,
    created_by: req.user.id,
    activity_type: 'Status Changed',
    description: `Bill #${invoice.invoice_number} status updated to ${invoice.status} after payment.`,
    related_to: invoice._id,
    related_type: 'Invoice',
    category: 'system',
    color_code: 'blue'
  });

  // Log Payment Received
  await logActivity({
    company_id: req.user.company_id,
    created_by: req.user.id,
    activity_type: 'Payment Added',
    description: `Received ${payload.status} payment of ₹${payment.amount} via ${payment.payment_method}. Bill #${invoice.invoice_number} is now ${invoice.status}.`,
    related_to: payment._id,
    related_type: 'Payment',
    category: 'system',
    color_code: 'green'
  });

  // Step 4 & 5: Sync Financials on Customer
  if (payment.customer_id) {
    const { syncCustomerFinancials } = require('../utils/financialsSync');
    await syncCustomerFinancials(payment.customer_id, req.user.company_id, req.user.id);
  }

  res.created(payment);
});

exports.getPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ _id: req.params.id, company_id: req.user.company_id })
    .populate('customer_id', 'name email')
    .populate('invoice_id', 'invoice_number total_amount paid_amount')
    .populate('deal_id', 'name');
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

  // Revert invoice amount if needed
  if (payment.invoice_id) {
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

  // Rule 5: Activity Log - Payment Removed
  const { logActivity } = require('../utils/activityLogger');
  await logActivity({
    company_id: req.user.company_id,
    user_id: req.user.id,
    type: 'Payment Removed',
    description: `Payment record #${payment.payment_number} for ₹${payment.amount} was deleted.`,
    related_to: payment._id,
    related_type: 'Payment',
    category: 'system',
    color_code: 'red'
  });

  res.ok(null, 'Payment moved to trash');
});
