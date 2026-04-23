const Deal = require('../models/Deal');
const DealHistory = require('../models/DealHistory');
const Notification = require('../models/Notification');
const Customer = require('../models/Customer');
const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const DemoUser = require('../models/DemoUser');
const { asyncHandler } = require('../middleware/asyncHandler');
const { moveDocumentToTrash } = require('../utils/trash');

function getAuthUserModelName(req) {
  return req?.user?.constructor?.modelName === 'DemoUser' ? 'DemoUser' : 'User';
}

async function resolveAssigneeModel(companyId, userId) {
  if (!userId) return null;
  const query = { _id: userId, company_id: companyId, status: 'active' };
  const user = await User.findOne(query).select('_id');
  if (user) return 'User';
  const demoUser = await DemoUser.findOne(query).select('_id');
  if (demoUser) return 'DemoUser';
  return null;
}

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

async function createAssignmentNotification(deal, userId, companyId, userModel = 'User') {
  if (!userId) return;
  
  try {
    await Notification.create({
      company_id: companyId,
      user_id: userId,
      user_id_model: userModel === 'DemoUser' ? 'DemoUser' : 'User',
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
    stage, 
    priority,
    lifecycle_status,
    startDate,
    endDate,
    q, 
    page = 1, 
    limit = 20, 
    sortField = 'created_at', 
    sortOrder = 'desc'
  } = req.query;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const sort = { [sortField]: sortOrder === 'desc' ? -1 : 1 };

  const search = buildSearchQuery(q);
  const filter = {};
  filter.company_id = req.user.company_id;
  
  if (customer_id) filter.customer_id = customer_id;
  if (assigned_to) filter.assigned_to = assigned_to;
  if (stage) filter.stage = stage;
  if (priority) filter.priority = priority;
  if (lifecycle_status) filter.lifecycle_status = lifecycle_status;

  if (search) {
    filter.$or = [
      { name: search },
      { readable_id: search },
      { description: search }
    ];
  }

  // Date Range Filtering (Expected Close Date)
  if (startDate || endDate) {
    filter.expected_close_date = {};
    if (startDate) filter.expected_close_date.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.expected_close_date.$lte = end;
    }
  }

  const [items, total] = await Promise.all([
    Deal.find(filter)
      .populate('customer_id', 'name email phone')
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

  if (!payload.assigned_to) {
    payload.assigned_to = req.user.id;
    payload.assigned_to_model = getAuthUserModelName(req);
  } else if (!payload.assigned_to_model) {
    payload.assigned_to_model = (await resolveAssigneeModel(req.user.company_id, payload.assigned_to)) || 'User';
  }

  if (!payload.readable_id) {
    payload.readable_id = await getNextDealId(req.user.company_id);
  }

  // Automations for Won/Lost on Creation
  if (payload.stage === 'Won') {
    payload.lifecycle_status = 'Closed';
    payload.actual_close_date = new Date();
    
    // Upgrade Customer to Active
    if (payload.customer_id) {
      await Customer.findByIdAndUpdate(payload.customer_id, { status: 'Active' });
      
      // Spawn Billing Ticket after creation (need the deal object/ID)
      // We will handle this after Deal.create
    }
  } else if (payload.stage === 'Lost') {
    payload.lifecycle_status = 'Closed';
    payload.actual_close_date = new Date();
  }

  const deal = await Deal.create(payload);
  
  // Post-creation automation
  if (deal.stage === 'Won' && deal.customer_id) {
    const count = await SupportTicket.countDocuments({ company_id: req.user.company_id });
    await SupportTicket.create({
      company_id: req.user.company_id,
      ticket_id: `TKT-${1001 + count}`,
      ticket_no: 1001 + count,
      customer_id: deal.customer_id,
      subject: `Billing Initiation - ${deal.name}`,
      description: `Deal ${deal.readable_id} created as WON. Process payment of ₹${deal.value}.`,
      status: 'open',
      priority: 'high',
      category: 'Billing'
    });
  }

  await DealHistory.create({
    deal_id: deal._id,
    user_id: req.user.id,
    user_id_model: getAuthUserModelName(req),
    action: 'created',
    new_value: deal.toObject()
  });

  if (payload.assigned_to) {
    await createAssignmentNotification(deal, payload.assigned_to, req.user.company_id, payload.assigned_to_model);
  }

  const { logActivity } = require('../utils/activityLogger');
  await logActivity({
    company_id: req.user.company_id,
    user_id: req.user.id,
    user_model: getAuthUserModelName(req),
    type: 'Deal Created',
    description: `New deal created: ${deal.name} (Stage: ${deal.stage})`,
    related_to: deal._id,
    related_type: 'Deal'
  });

  const populated = await Deal.findById(deal._id).populate('customer_id', 'name email phone').populate('assigned_to', 'name email');
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

  const updates = { ...(req.body || {}) };
  if (updates.assigned_to && !updates.assigned_to_model) {
    updates.assigned_to_model = (await resolveAssigneeModel(req.user.company_id, updates.assigned_to)) || 'User';
  }

  // Automations for Won/Lost
  if (updates.stage === 'Won' && oldDeal.stage !== 'Won') {
    updates.lifecycle_status = 'Closed';
    updates.actual_close_date = new Date();
    
    // Upgrade Customer to Active
    if (oldDeal.customer_id) {
      await Customer.findByIdAndUpdate(oldDeal.customer_id, { status: 'Active' });
      
      // Spawn Billing Ticket
      const count = await SupportTicket.countDocuments({ company_id: req.user.company_id });
      await SupportTicket.create({
        company_id: req.user.company_id,
        ticket_id: `TKT-${1001 + count}`,
        ticket_no: 1001 + count,
        customer_id: oldDeal.customer_id,
        subject: `Billing Initiation - ${oldDeal.name}`,
        description: `Deal ${oldDeal.readable_id} WON. Process payment of ₹${oldDeal.value}.`,
        status: 'open',
        priority: 'high',
        category: 'Billing'
      });
    }
  } else if (updates.stage === 'Lost' && oldDeal.stage !== 'Lost') {
    updates.lifecycle_status = 'Closed';
    updates.actual_close_date = new Date();
  }

  const deal = await Deal.findOneAndUpdate(
    { _id: req.params.id, company_id: req.user.company_id },
    updates,
    { new: true }
  );

  // History logging
  const changes = [];
  if (updates.stage && updates.stage !== oldDeal.stage) {
    changes.push({ field: 'stage', old: oldDeal.stage, new: updates.stage });
  }
  if (updates.value && updates.value !== oldDeal.value) {
    changes.push({ field: 'value', old: oldDeal.value, new: updates.value });
  }

  for (const change of changes) {
    await DealHistory.create({
      deal_id: deal._id,
      user_id: req.user.id,
      user_id_model: getAuthUserModelName(req),
      action: 'updated',
      field: change.field,
      old_value: change.old,
      new_value: change.new
    });
  }

  const populated = await Deal.findById(deal._id).populate('customer_id', 'name email phone').populate('assigned_to', 'name email');
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
  
  const stats = {
    total: deals.length,
    won: deals.filter(d => d.stage === 'Won').length,
    lost: deals.filter(d => d.stage === 'Lost').length,
    revenue: deals.filter(d => d.stage === 'Won').reduce((sum, d) => sum + (d.value || 0), 0),
  };

  stats.conversionRate = stats.total > 0 ? (stats.won / stats.total) * 100 : 0;
  res.ok(stats);
});
