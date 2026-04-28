const Invoice = require('../models/Invoice');
const Counter = require('../models/Counter');
const mongoose = require('mongoose');
const { asyncHandler } = require('../middleware/asyncHandler');
const { moveDocumentToTrash } = require('../utils/trash');

async function getNextInvoiceNumber(companyId) {
  const counter = await Counter.findOneAndUpdate(
    { company_id: companyId, model: 'Invoice', field: 'invoiceNumber' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  if (!counter.prefix || counter.prefix === 'LD-') {
     counter.prefix = 'INV-';
     await counter.save();
  }
  return `${counter.prefix}${String(counter.seq).padStart(3, '0')}`;
}

exports.listInvoices = asyncHandler(async (req, res) => {
  const { status, customer_id, deal_id, startDate, endDate, q, page = 1, limit = 20 } = req.query;

  const filter = { company_id: req.user.company_id };
  if (status) filter.status = status;
  if (customer_id) filter.customer_id = customer_id;
  if (deal_id) filter.deal_id = deal_id;
  
  if (startDate || endDate) {
    filter.invoice_date = {};
    if (startDate) filter.invoice_date.$gte = new Date(startDate);
    if (endDate) filter.invoice_date.$lte = new Date(endDate);
  }

  if (q) {
    filter.invoice_number = { $regex: q, $options: 'i' };
  }

  // Role-based filtering
  if (req.user.role === 'Employee') {
    const Deal = require('../models/Deal');
    const myDeals = await Deal.find({ assigned_to: req.user.id, company_id: req.user.company_id }).select('_id');
    const myDealIds = myDeals.map(d => d._id);
    filter.deal_id = { $in: myDealIds };
  } else if (req.user.role === 'Customer') {
    filter.customer_id = req.user.id;
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 20);

  const [items, total] = await Promise.all([
    Invoice.find(filter)
      .populate('customer_id', 'name email phone')
      .sort({ created_at: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Invoice.countDocuments(filter)
  ]);

  res.ok({ items, total, page: pageNum, limit: limitNum });
});

exports.createInvoice = asyncHandler(async (req, res) => {
  const payload = req.body;
  
  // Rule 1: No Invoice without Deal
  if (!payload.deal_id) {
    return res.fail('Business Rule Violation: Invoices cannot be created without an associated Deal.', 400);
  }

  payload.company_id = req.user.company_id;
  payload.created_by = req.user.id;

  if (!payload.invoice_number) {
    payload.invoice_number = await getNextInvoiceNumber(req.user.company_id);
  }

  // Calculate totals if not provided or to ensure correctness
  let subtotal = 0;
  if (payload.items && Array.isArray(payload.items)) {
    payload.items.forEach(item => {
      item.amount = (item.quantity || 1) * (item.price || 0);
      subtotal += item.amount;
    });
  } else {
    subtotal = payload.total_amount || 0;
  }
  payload.subtotal = subtotal;
  payload.tax_amount = (subtotal * (payload.tax_rate || 0)) / 100;
  payload.total_amount = subtotal + payload.tax_amount;

  const invoice = await Invoice.create(payload);
  res.created(invoice);
});

exports.getInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, company_id: req.user.company_id })
    .populate('customer_id', 'name email phone address city state pincode')
    .populate('deal_id', 'name assigned_to');
  if (!invoice) return res.fail('Invoice not found', 404);

  // RBAC for Employee/Customer
  if (req.user.role === 'Employee') {
    const isAssigned = invoice.deal_id && String(invoice.deal_id.assigned_to) === req.user.id;
    if (!isAssigned) return res.fail('Unauthorized access to this bill', 403);
  } else if (req.user.role === 'Customer') {
    if (String(invoice.customer_id._id || invoice.customer_id) !== req.user.id) {
      return res.fail('Unauthorized access to this bill', 403);
    }
  }

  res.ok(invoice);
});

exports.updateInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOneAndUpdate(
    { _id: req.params.id, company_id: req.user.company_id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!invoice) return res.fail('Invoice not found', 404);
  res.ok(invoice);
});

exports.deleteInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, company_id: req.user.company_id });
  if (!invoice) return res.fail('Invoice not found', 404);

  // RBAC: Only Admin can delete
  if (req.user.role !== 'Admin') {
    return res.fail('Unauthorized: Only administrators can delete bills', 403);
  }

  await moveDocumentToTrash({ entityType: 'invoice', document: invoice, deletedBy: req.user.id });
  res.ok(null, 'Invoice moved to trash');
});

exports.generateInvoiceFromDeal = asyncHandler(async (req, res) => {
  const { dealId } = req.body;
  if (!dealId) return res.fail('Deal ID is required', 400);

  const Deal = require('../models/Deal');
  const deal = await Deal.findOne({ _id: dealId, company_id: req.user.company_id });
  if (!deal) return res.fail('Deal not found', 404);
  if (deal.stage !== 'Won') return res.fail('Invoice can only be generated for WON deals', 400);

  const { autoGenerateInvoice } = require('../utils/invoiceHelper');
  const invoice = await autoGenerateInvoice(deal, req.user.id);
  
  if (!invoice) return res.fail('Failed to generate invoice', 500);
  res.created(invoice);
});

exports.logInvoiceAction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // e.g. "Sent via Email", "Shared via WhatsApp"

  const invoice = await Invoice.findOne({ _id: id, company_id: req.user.company_id });
  if (!invoice) return res.fail('Invoice not found', 404);

  const { logActivity } = require('../utils/activityLogger');
  await logActivity({
    company_id: req.user.company_id,
    created_by: req.user.id,
    activity_type: 'Invoice Action',
    category: 'system',
    description: `Bill #${invoice.invoice_number} was ${action}.`,
    related_to: invoice._id,
    related_type: 'Invoice',
    color_code: 'blue'
  });

  res.ok(null, 'Action logged');
});
