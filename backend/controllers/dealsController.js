const Deal = require('../models/Deal');
const DealHistory = require('../models/DealHistory');
const Notification = require('../models/Notification');
const Customer = require('../models/Customer');
const SupportTicket = require('../models/SupportTicket');
const { asyncHandler } = require('../middleware/asyncHandler');
const { moveDocumentToTrash } = require('../utils/trash');

async function getNextDealId(companyId) {
  const count = await Deal.countDocuments({ company_id: companyId });
  return `DL-${1001 + count}`;
}

function buildSearchQuery(q) {
  if (!q) return null;
  const safe = String(q).trim();
  if (!safe) return null;
  return { $regex: safe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
}

async function createAssignmentNotification(deal, userId, companyId) {
  if (!userId) return;
  
  try {
    await Notification.create({
      company_id: companyId,
      user_id: userId,
      title: 'New Deal Assigned',
      message: `You have been assigned to the deal: ${deal.name}`,
      type: 'deal',
      linked_entity_id: deal._id,
      linked_entity_type: 'Deal',
      is_read: false
    });
  } catch (err) {
    console.error('Failed to create assignment notification:', err);
  }
}

exports.listDeals = asyncHandler(async (req, res) => {
  const { 
    company_id, 
    customer_id, 
    assigned_to,
    status, 
    startDate,
    endDate,
    q, 
    page = 1, 
    limit = 20, 
    sortField = 'created_at', 
    sortOrder = 'desc',
    all
  } = req.query;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const sort = { [sortField]: sortOrder === 'desc' ? -1 : 1 };

  const search = buildSearchQuery(q);
  const filter = {};
  filter.company_id = req.user.company_id;
  if (customer_id) filter.customer_id = customer_id;
  if (assigned_to) filter.assigned_to = assigned_to;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: search },
      { readable_id: search },
      { description: search }
    ];
  }

  // Date Range Filtering
  if (startDate || endDate) {
    filter.created_at = {};
    if (startDate) filter.created_at.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.created_at.$lte = end;
    }
  }

  const [items, total] = await Promise.all([
    Deal.find(filter)
      .populate('customer_id', 'name email')
      .populate('assigned_to', 'name email')
      .sort(sort)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Deal.countDocuments(filter),
  ]);

  res.ok({ items, page: pageNum, limit: limitNum, total });
});

exports.createDeal = asyncHandler(async (req, res) => {
  const payload = req.body || {};
  payload.company_id = req.user.company_id;

  if (!payload.readable_id) {
    payload.readable_id = await getNextDealId(req.user.company_id);
  }

  const deal = await Deal.create(payload);
  
  await DealHistory.create({
    deal_id: deal._id,
    user_id: req.user.id,
    action: 'created',
    new_value: deal.toObject()
  });

  if (payload.assigned_to) {
    await createAssignmentNotification(deal, payload.assigned_to, req.user.company_id);
  }

  const { logActivity } = require('../utils/activityLogger');
  await logActivity({
    company_id: req.user.company_id,
    user_id: req.user.id,
    type: 'Deal Created',
    description: `New deal created: ${deal.name}`,
    related_to: deal._id,
    related_type: 'Deal'
  });

  const populated = await Deal.findById(deal._id).populate('customer_id', 'name email').populate('assigned_to', 'name email');
  res.created(populated);
});

exports.getDeal = asyncHandler(async (req, res) => {
  const deal = await Deal.findOne({ _id: req.params.id, company_id: req.user.company_id }).populate('customer_id').populate('assigned_to', 'name email');
  if (!deal) {
    return res.fail('Deal not found', 404);
  }
  res.ok(deal);
});

exports.updateDeal = asyncHandler(async (req, res) => {
  const oldDeal = await Deal.findOne({ _id: req.params.id, company_id: req.user.company_id });
  if (!oldDeal) {
    return res.fail('Deal not found', 404);
  }

  // RBAC: Only Admin, Manager, or the Assigned Employee can update
  const isAdmin = req.user.role === 'Admin';
  const isManager = req.user.role === 'Manager';
  const isAssigned = String(oldDeal.assigned_to) === req.user.id;

  if (!isAdmin && !isManager && !isAssigned) {
    return res.fail('Unauthorized: Only managers or the assigned employee can update this deal', 403);
  }

  const deal = await Deal.findOneAndUpdate(
    { _id: req.params.id, company_id: req.user.company_id },
    req.body,
    { new: true }
  );

  // Automation: Deal -> Customer -> Ticket
  if (req.body.status === 'Won' && oldDeal.status !== 'Won') {
    // 1. Upgrade Prospect to Active Customer
    if (deal.customer_id) {
      await Customer.findByIdAndUpdate(deal.customer_id, { status: 'Active' });
      
      // 2. Spawn Onboarding / Billing Ticket
      const count = await SupportTicket.countDocuments({ company_id: req.user.company_id });
      await SupportTicket.create({
        company_id: req.user.company_id,
        ticket_id: `TKT-${1001 + count}`,
        ticket_no: 1001 + count,
        customer_id: deal.customer_id,
        subject: `Onboarding & Billing - ${deal.name}`,
        description: `Automated Ticket: Deal ${deal.readable_id || deal._id} has been Won. Please proceed with onboarding and invoice generation.`,
        status: 'open',
        priority: 'high',
        category: 'Billing'
      });

      const { logActivity } = require('../utils/activityLogger');
      await logActivity({
        company_id: req.user.company_id,
        user_id: req.user.id,
        type: 'Deal Won',
        description: `Deal WON: ${deal.name}`,
        related_to: deal._id,
        related_type: 'Deal'
      });
    }
  }
  
  // Basic history logging for status or value changes
  const changes = [];
  if (req.body.status && req.body.status !== oldDeal.status) {
    changes.push({ field: 'status', old: oldDeal.status, new: req.body.status });
  }
  if (req.body.value && req.body.value !== oldDeal.value) {
    changes.push({ field: 'value', old: oldDeal.value, new: req.body.value });
  }
  if (req.body.assigned_to && req.body.assigned_to.toString() !== (oldDeal.assigned_to?.toString())) {
    changes.push({ field: 'assigned_to', old: oldDeal.assigned_to, new: req.body.assigned_to });
  }

  for (const change of changes) {
    await DealHistory.create({
      deal_id: deal._id,
      user_id: req.user.id,
      action: 'updated',
      field: change.field,
      old_value: change.old,
      new_value: change.new,
      change_reason: req.body.change_reason || null
    });
  }

  // Handle reassignment notification
  if (req.body.assigned_to && req.body.assigned_to.toString() !== (oldDeal.assigned_to?.toString())) {
    await createAssignmentNotification(deal, req.body.assigned_to, req.user.company_id);
  }

  const populated = await Deal.findById(deal._id).populate('customer_id', 'name email').populate('assigned_to', 'name email');
  res.ok(populated);
});

exports.deleteDeal = asyncHandler(async (req, res) => {
  // RBAC: Only Admin or Manager can delete
  if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
    return res.fail('Unauthorized: Only administrators or managers can delete deals', 403);
  }

  const deal = await Deal.findOne({ _id: req.params.id, company_id: req.user.company_id });
  if (!deal) {
    return res.fail('Deal not found', 404);
  }
  await moveDocumentToTrash({ entityType: 'deal', document: deal, deletedBy: req.user?.id });
  res.ok(null, 'Deal moved to trash');
});

exports.getDealHistory = asyncHandler(async (req, res) => {
  const history = await DealHistory.find({ deal_id: req.params.id })
    .populate('user_id', 'name email')
    .sort({ created_at: -1 });
  res.ok(history);
});

exports.getDealAnalytics = asyncHandler(async (req, res) => {
  const filter = { company_id: req.user.company_id };

  const deals = await Deal.find(filter);
  const wonStatuses = new Set(['Converted', 'Closed Won']);
  const lostStatuses = new Set(['Not Interested', 'Closed Lost']);
  
  const stats = {
    total: deals.length,
    won: deals.filter(d => wonStatuses.has(d.status)).length,
    lost: deals.filter(d => lostStatuses.has(d.status)).length,
    revenue: deals.filter(d => wonStatuses.has(d.status)).reduce((sum, d) => sum + (d.value || 0), 0),
  };

  stats.conversionRate = stats.total > 0 ? (stats.won / stats.total) * 100 : 0;

  res.ok(stats);
});
