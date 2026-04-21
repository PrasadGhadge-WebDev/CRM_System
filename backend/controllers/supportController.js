const { moveDocumentToTrash } = require('../utils/trash');
const Customer = require('../models/Customer');
const { asyncHandler } = require('../middleware/asyncHandler');
const mongoose = require('mongoose');

// @desc    Get all tickets with filtering and pagination
// @route   GET /api/support
// @access  Protected
exports.getTickets = asyncHandler(async (req, res) => {
  const {
    customer_id,
    status,
    priority,
    q,
    page = 1,
    limit = 20,
    sortField = 'created_at',
    sortOrder = 'desc',
    customer_is_vip,
    all
  } = req.query;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

  const filter = {};
  filter.company_id = req.user.company_id;

  if (customer_id) filter.customer_id = customer_id;
  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  if (customer_is_vip === 'true' || customer_is_vip === '1') {
    const vipCustomers = await Customer.find({ company_id: req.user.company_id, is_vip: true }).select('_id');
    const vipIds = vipCustomers.map(c => c._id);
    filter.customer_id = { $in: vipIds };
  }

  // Employees see only assigned, Admin/Manager see all company tickets
  if (req.user.role === 'Employee') {
    filter.assigned_to = req.user.id;
  }

  // Accountants default to Billing category if not specified
  if (req.user.role === 'Accountant' && !category && !q) {
    filter.category = 'Billing';
  }

  if (q && q.trim()) {
    const search = { $regex: q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    filter.$or = [{ ticket_id: search }, { subject: search }, { description: search }, { category: search }];
  }

  const [items, total] = await Promise.all([
    SupportTicket.find(filter)
      .populate('customer_id', 'name email')
      .populate('assigned_to', 'name email')
      .sort(sort)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    SupportTicket.countDocuments(filter),
  ]);

  res.ok({ items, total, page: pageNum, limit: limitNum });
});

// @desc    Get single ticket by ID
// @route   GET /api/support/:id
// @access  Protected
exports.getTicketById = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findOne({
    _id: req.params.id,
    company_id: req.user.company_id
  }).populate('customer_id').populate('assigned_to', 'name email');

  if (!ticket) {
    return res.fail('Ticket not found', 404);
  }

  res.ok(ticket);
});

// @desc    Create a new support ticket
// @route   POST /api/support
// @access  Protected
exports.createTicket = asyncHandler(async (req, res) => {
  const { customer_id, subject, description, priority, category, assigned_to } = req.body;

  if (!customer_id || !subject || !description) {
    return res.fail('Customer, subject, and description are required', 400);
  }

  const ticket = await SupportTicket.create({
    company_id: req.user.company_id,
    customer_id,
    subject,
    description,
    priority: priority || 'medium',
    category,
    assigned_to: assigned_to || (req.user.role === 'Admin' ? null : req.user.id),
    status: 'open'
  });

  const { logActivity } = require('../utils/activityLogger');
  await logActivity({
    company_id: req.user.company_id,
    user_id: req.user.id,
    type: 'Ticket Raised',
    description: `New ticket raised: ${ticket.subject}`,
    related_to: ticket._id,
    related_type: 'SupportTicket'
  });

  const populatedTicket = await SupportTicket.findById(ticket._id)
    .populate('customer_id', 'name email')
    .populate('assigned_to', 'name email');

  res.created(populatedTicket, 'Support ticket created successfully');
});

// @desc    Update a support ticket
// @route   PATCH /api/support/:id
// @access  Protected
exports.updateTicket = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'Admin';
  const isManager = req.user.role === 'Manager';

  // Authorization: Only Admin / Manager can set status to 'closed'
  if (req.body.status === 'closed' && !isAdmin && !isManager) {
    return res.fail('Verification required: Only Admins or Managers can permanently close tickets. Please use "Resolved" to signal completion.', 403);
  }

  const ticket = await SupportTicket.findOneAndUpdate(
    { _id: req.params.id, company_id: req.user.company_id },
    req.body,
    { new: true, runValidators: true }
  ).populate('customer_id', 'name email').populate('assigned_to', 'name email');

  if (!ticket) {
    return res.fail('Ticket not found', 404);
  }

  res.ok(ticket, 'Ticket updated successfully');
});

// @desc    Delete a support ticket
// @route   DELETE /api/support/:id
// @access  Protected (Admin only)
exports.deleteTicket = asyncHandler(async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.fail('Only administrators can delete tickets', 403);
  }

  const ticket = await SupportTicket.findOne({
    _id: req.params.id,
    company_id: req.user.company_id
  });

  if (!ticket) {
    return res.fail('Ticket not found', 404);
  }

  await moveDocumentToTrash({ entityType: 'support_ticket', document: ticket, deletedBy: req.user?.id });
  res.ok(null, 'Ticket moved to trash');
});

// @desc    Escalate a support ticket
// @route   PATCH /api/support/:id/escalate
// @access  Protected
exports.escalateTicket = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  if (!reason) {
    return res.fail('Escalation reason is required', 400);
  }

  const ticket = await SupportTicket.findOneAndUpdate(
    { _id: req.params.id, company_id: req.user.company_id },
    {
      is_escalated: true,
      escalation_reason: reason,
      escalated_by: req.user.id,
      escalated_at: new Date(),
      status: 'in-progress',
      priority: 'urgent'
    },
    { new: true }
  ).populate('customer_id', 'name').populate('escalated_by', 'name');

  if (!ticket) {
    return res.fail('Ticket not found', 404);
  }

  // Log activity
  const { logActivity } = require('../utils/activityLogger');
  await logActivity({
    company_id: req.user.company_id,
    user_id: req.user.id,
    description: `Ticket escalated: ${reason}`,
    related_to: ticket._id,
    related_type: 'SupportTicket'
  });

  res.ok(ticket, 'Ticket escalated successfully to management');
});

// @desc    Add an internal note to a support ticket
// @route   PATCH /api/support/:id/note
// @access  Protected
exports.addNote = asyncHandler(async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.fail('Note text is required', 400);
  }

  const ticket = await SupportTicket.findOneAndUpdate(
    { _id: req.params.id, company_id: req.user.company_id },
    {
      $push: {
        notes: {
          text,
          author_name: req.user.name || req.user.username,
          created_at: new Date()
        }
      }
    },
    { new: true }
  );

  if (!ticket) {
    return res.fail('Ticket not found', 404);
  }

  res.ok(ticket, 'Internal note added to incident timeline');
});
