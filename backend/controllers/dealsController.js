const Deal = require('../models/Deal');
const DealHistory = require('../models/DealHistory');
const Notification = require('../models/Notification');
const Customer = require('../models/Customer');
const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/asyncHandler');
const { moveDocumentToTrash } = require('../utils/trash');

function getAuthUserModelName(req) {
  return 'User';
}

async function resolveAssigneeModel(companyId, userId) {
  if (!userId) return null;
  const query = { _id: userId, company_id: companyId, status: 'active' };
  const user = await User.findOne(query).select('_id');
  return user ? 'User' : null;
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
      user_id_model: 'User',
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

  // Role-based filtering
  if (req.user.role === 'HR') {
    return res.fail('HR role does not have access to deals', 403);
  }

  const filter = { company_id: req.user.company_id };
  
  if (req.user.role === 'Employee') {
    filter.assigned_to = req.user.id;
  } else if (req.user.role === 'Accountant') {
    filter.stage = 'Won';
  } else if (assigned_to) {
    filter.assigned_to = assigned_to;
  }

  if (customer_id) filter.customer_id = customer_id;
  if (stage) filter.stage = stage;
  if (priority) filter.priority = priority;
  if (lifecycle_status) filter.lifecycle_status = lifecycle_status;

  const search = buildSearchQuery(q);
  if (search) {
    filter.$or = [{ name: search }, { readable_id: search }, { description: search }];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = limit === 'all' ? 1000 : Math.min(100, Math.max(1, Number(limit) || 20));
  const sort = { [sortField]: sortOrder === 'desc' ? -1 : 1 };

  const [items, total] = await Promise.all([
    Deal.find(filter)
      .populate('customer_id', 'name email phone')
      .populate('assigned_to', 'name email')
      .sort(sort)
      .skip(limit === 'all' ? 0 : (pageNum - 1) * limitNum)
      .limit(limit === 'all' ? 1000 : limitNum),
    Deal.countDocuments(filter),
  ]);

  res.ok({ items, page: pageNum, limit: limitNum, total });
});

exports.createDeal = asyncHandler(async (req, res) => {
  const payload = req.body || {};
  payload.company_id = req.user.company_id;
  payload.created_by = req.user.id;

  if (!payload.assigned_to) {
    payload.assigned_to = req.user.id;
  }

  if (!payload.readable_id) {
    payload.readable_id = await getNextDealId(req.user.company_id);
  }

  // Automation for Won/Lost
  if (payload.stage === 'Won' || payload.stage === 'Lost') {
    payload.actual_close_date = new Date();
  }

  const deal = await Deal.create(payload);
  
  // Financial Sync & Activity
  if (deal.customer_id) {
    const { syncCustomerFinancials } = require('../utils/financialsSync');
    await syncCustomerFinancials(deal.customer_id, req.user.company_id, req.user.id);
  }

  const { logActivity } = require('../utils/activityLogger');
  await logActivity({
    company_id: req.user.company_id,
    created_by: req.user.id,
    activity_type: 'Deal Created',
    category: 'system',
    description: `Deal created: ${deal.name} (Valuation: ₹${deal.value})`,
    related_to: deal._id,
    related_type: 'Deal',
    color_code: 'blue'
  });

  const populated = await Deal.findById(deal._id).populate('customer_id', 'name email phone').populate('assigned_to', 'name email').populate('created_by', 'name');
  res.created(populated);
});

exports.getDeal = asyncHandler(async (req, res) => {
  const deal = await Deal.findOne({ _id: req.params.id, company_id: req.user.company_id })
    .populate('customer_id')
    .populate('assigned_to', 'name email')
    .populate('created_by', 'name email');
    
  if (!deal) return res.fail('Deal not found', 404);

  // RBAC
  const isHR = req.user.role === 'HR';
  const isEmployee = req.user.role === 'Employee';
  const isAccountant = req.user.role === 'Accountant';
  
  if (isHR) return res.fail('Access denied', 403);
  if (isEmployee && String(deal.assigned_to?._id || deal.assigned_to) !== req.user.id) {
    return res.fail('Unauthorized access', 403);
  }
  if (isAccountant && deal.stage !== 'Won') {
    return res.fail('Accountants only view Won deals', 403);
  }

  res.ok(deal);
});

exports.updateDeal = asyncHandler(async (req, res) => {
  const oldDeal = await Deal.findOne({ _id: req.params.id, company_id: req.user.company_id });
  if (!oldDeal) return res.fail('Deal not found', 404);

  // RBAC
  const isManagement = ['Admin', 'Manager'].includes(req.user.role);
  const isOwner = String(oldDeal.assigned_to?._id || oldDeal.assigned_to) === req.user.id;
  const isEmployee = req.user.role === 'Employee';

  if (!isManagement && !(isEmployee && isOwner)) {
    return res.fail('Unauthorized update', 403);
  }

  const updates = { ...(req.body || {}) };
  
  // Automate Close Date on Stage Change
  if (updates.stage && updates.stage !== oldDeal.stage) {
    if (updates.stage === 'Won' || updates.stage === 'Lost') {
      updates.actual_close_date = new Date();
      if (updates.stage === 'Lost' && !updates.lost_reason && !oldDeal.lost_reason) {
        return res.fail('Lost reason required', 400);
      }
    } else {
      updates.actual_close_date = null;
    }
  }

  const deal = await Deal.findOneAndUpdate(
    { _id: req.params.id, company_id: req.user.company_id },
    updates,
    { new: true }
  );

  // Activity Tracking: Stage Changed / Won / Lost
  if (updates.stage && updates.stage !== oldDeal.stage) {
    const { logActivity } = require('../utils/activityLogger');
    let actType = 'Stage Changed';
    let color = 'purple';
    if (updates.stage === 'Won') { color = 'green'; actType = 'Deal Won'; }
    if (updates.stage === 'Lost') { color = 'red'; actType = 'Deal Lost'; }

    await logActivity({
      company_id: req.user.company_id,
      created_by: req.user.id,
      activity_type: actType,
      category: 'system',
      description: `Opportunity advanced: ${oldDeal.stage} → ${updates.stage}.`,
      related_to: deal._id,
      related_type: 'Deal',
      color_code: color
    });

    // We no longer auto-generate invoice here. 
    // Flow: Employee wins deal -> Accountant manually generates invoice.
  }

  // Financial Sync
  if (deal.customer_id) {
    const { syncCustomerFinancials } = require('../utils/financialsSync');
    await syncCustomerFinancials(deal.customer_id, req.user.company_id, req.user.id);
  }

  const populated = await Deal.findById(deal._id)
    .populate('customer_id', 'name email phone')
    .populate('assigned_to', 'name email')
    .populate('created_by', 'name');
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

  const customerId = deal.customer_id;
  await moveDocumentToTrash({ entityType: 'deal', document: deal, deletedBy: req.user?.id });

  // Step 4 & 5: Sync Financials after deletion
  if (customerId) {
    const { syncCustomerFinancials } = require('../utils/financialsSync');
    await syncCustomerFinancials(customerId, req.user.company_id, req.user.id);
  }

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
