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
    filter.$or = [
      { stage: 'Won' },
      { payment_status: { $in: ['Unpaid', 'Partial'] } }
    ];
  } else if (assigned_to) {
    filter.assigned_to = assigned_to;
  }

  if (customer_id) filter.customer_id = customer_id;
  if (stage) filter.stage = stage;
  if (priority) filter.priority = priority;
  if (lifecycle_status) filter.lifecycle_status = lifecycle_status;

  const searchQuery = buildSearchQuery(q);
  if (searchQuery) {
    filter.$or = [
      { name: searchQuery },
      { readable_id: searchQuery },
      { description: searchQuery },
      { stage: searchQuery },
      { priority: searchQuery },
      { lifecycle_status: searchQuery },
      { payment_status: searchQuery }
    ];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = limit === 'all' ? 1000 : Math.min(100, Math.max(1, Number(limit) || 20));
  const sort = { [sortField]: sortOrder === 'desc' ? -1 : 1 };

  const summaryPipeline = [
    { $match: filter },
    {
      $group: {
        _id: '$stage',
        count: { $sum: 1 },
        totalValue: { $sum: '$value' }
      }
    }
  ];

  const [items, totalFiltered, stageStats] = await Promise.all([
    Deal.find(filter)
      .populate('customer_id', 'name email phone')
      .populate('assigned_to', 'name email phone')
      .sort(sort)
      .skip(limit === 'all' ? 0 : (pageNum - 1) * limitNum)
      .limit(limit === 'all' ? 1000 : limitNum),
    Deal.countDocuments(filter),
    Deal.aggregate(summaryPipeline)
  ]);

  const summary = {
    total: totalFiltered,
    totalValue: 0,
    byStage: {}
  };
  stageStats.forEach(s => {
    if (s._id) {
      summary.byStage[s._id] = s.count;
      summary.totalValue += (s.totalValue || 0);
    }
  });

  res.ok({ items, page: pageNum, limit: limitNum, total: totalFiltered, summary });
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

  // Duplicate Check
  if (payload.name && payload.customer_id) {
    const existing = await Deal.findOne({
      company_id: req.user.company_id,
      customer_id: payload.customer_id,
      name: payload.name,
      value: payload.value || 0
    });
    if (existing) {
      return res.fail('Deal already exists for this customer', 400);
    }
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
  if (isEmployee) {
    const assignedId = deal.assigned_to?._id || deal.assigned_to;
    const currentUserId = req.user._id || req.user.id;
    if (String(assignedId) !== String(currentUserId)) {
      return res.fail('Unauthorized access: This deal is not assigned to you', 403);
    }
  }
  if (isAccountant) {
    const isWon = deal.stage === 'Won';
    const hasPendingPayment = ['Unpaid', 'Partial'].includes(deal.payment_status);
    if (!isWon && !hasPendingPayment) {
      return res.fail('Accountants only view Won or payment-pending deals', 403);
    }
  }

  res.ok(deal);
});

exports.updateDeal = asyncHandler(async (req, res) => {
  const oldDeal = await Deal.findOne({ _id: req.params.id, company_id: req.user.company_id });
  if (!oldDeal) return res.fail('Deal not found', 404);

  // RBAC: Allowed roles for update/assignment
  const allowedRoles = ['Admin', 'Manager', 'Employee', 'Accountant'];
  const isAllowedRole = allowedRoles.includes(req.user.role);
  const isOwner = String(oldDeal.assigned_to?._id || oldDeal.assigned_to) === req.user.id;

  if (!isAllowedRole && !isOwner) {
    return res.fail('Unauthorized update', 403);
  }

  const updates = { ...(req.body || {}) };
  
  // Duplicate Check on Update
  if (updates.name || updates.customer_id || updates.value !== undefined) {
    const checkName = updates.name || oldDeal.name;
    const checkCust = updates.customer_id || oldDeal.customer_id;
    const checkVal  = updates.value !== undefined ? updates.value : oldDeal.value;
    
    const existing = await Deal.findOne({
      _id: { $ne: req.params.id },
      company_id: req.user.company_id,
      customer_id: checkCust,
      name: checkName,
      value: checkVal
    });
    if (existing) {
      return res.fail('Another deal with same name and amount already exists for this customer', 400);
    }
  }

  // Automate Close Date on Stage/Status Change
  if ((updates.stage && updates.stage !== oldDeal.stage) || (updates.status && updates.status !== oldDeal.status)) {
    const isNowLost = updates.stage === 'Lost';
    const isNowWon = updates.stage === 'Won';
    const isNowClosed = updates.status === 'Closed';

    if (isNowLost || isNowClosed) {
      updates.actual_close_date = new Date();
      if (isNowLost) {
        updates.status = 'Closed';
        if (!updates.lost_reason && !oldDeal.lost_reason) {
          return res.fail('Lost reason required', 400);
        }
      }
    } else if (updates.stage && !['Won', 'Lost'].includes(updates.stage)) {
       updates.status = 'Open';
       updates.actual_close_date = null;
    }

    // Auto-activate customer on Won
    if (isNowWon && oldDeal.customer_id) {
      const Customer = require('../models/Customer');
      await Customer.findByIdAndUpdate(oldDeal.customer_id, { status: 'Active' });
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
    if (updates.stage === 'Won') { 
      color = 'green'; 
      actType = 'Deal Won'; 
      
      // Auto-generate invoice and pending payment when Deal is Won
      const { autoGenerateInvoice, autoGeneratePendingPayment } = require('../utils/financeHelper');
      const invoice = await autoGenerateInvoice(deal, req.user.id);
      if (invoice) {
        await autoGeneratePendingPayment(deal, invoice, req.user.id);
      }
    }
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
