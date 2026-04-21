const mongoose = require('mongoose');
const Company = require('../models/Company');
const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const Deal = require('../models/Deal');
const User = require('../models/User');
const Activity = require('../models/Activity');
const Order = require('../models/Order');
const SupportTicket = require('../models/SupportTicket');
const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/asyncHandler');

exports.getMetrics = asyncHandler(async (req, res) => {
  // A "Global Admin" is strictly an Admin with NO company_id (superuser).
  // Any Admin WITH a company_id is a regular company admin — must be scoped.
  const isGlobalAdmin = req.user?.role === 'Admin' && !req.user?.company_id;
  const isEmployee = req.user?.role === 'Employee';

  // Safety guard: if not a global admin, company_id must be present
  if (!isGlobalAdmin && !req.user?.company_id) {
    req.user.company_id = new mongoose.Types.ObjectId();
  }

  const demoCompanyIds = isGlobalAdmin
    ? await User.distinct('company_id', {
        company_id: { $ne: null },
        $or: [{ is_demo: true }, { is_trial: true }],
      })
    : [];

  // Always scope to company_id when user has one — never allow empty filter
  // Use the exact same filtering as list views: scope to user's company_id (or null if unassigned)
  const queryCompanyId = req.user.company_id ? new mongoose.Types.ObjectId(req.user.company_id) : null;
  const companyFilter = { company_id: queryCompanyId };
  
  // For global calculations like Revenue, we must also respect this scoping
  const companyQuery = queryCompanyId ? { _id: queryCompanyId } : { _id: null };

  const leadFilter = { ...companyFilter };
  const customerFilter = { ...companyFilter };
  const dealFilter = { ...companyFilter };
  const userFilter = {
    ...companyFilter,
    status: 'active',
    is_demo: { $ne: true },
    is_trial: { $ne: true },
  };
  const userObjectId = req.user?._id ? new mongoose.Types.ObjectId(req.user._id) : null;
  const employeeLeadFilter = isEmployee && userObjectId ? { ...leadFilter, assigned_to: userObjectId } : null;
  const employeeDealFilter = isEmployee && userObjectId ? { ...dealFilter, assigned_to: userObjectId } : null;
  const employeeActivityFilter = isEmployee && userObjectId ? { ...companyFilter, created_by: userObjectId } : null;

  const monthsToInclude = 6;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const trendStartDate = new Date();
  trendStartDate.setDate(1);
  trendStartDate.setHours(0, 0, 0, 0);
  trendStartDate.setMonth(trendStartDate.getMonth() - (monthsToInclude - 1));

  const monthBuckets = Array.from({ length: monthsToInclude }).map((_, idx) => {
    const date = new Date(trendStartDate);
    date.setMonth(trendStartDate.getMonth() + idx);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return { key, year: date.getFullYear(), month: date.getMonth() + 1, label: `${monthNames[date.getMonth()]} ${String(date.getFullYear()).slice(-2)}` };
  });

  const fillTrend = (raw = [], valueKey = 'count') => {
    const lookup = new Map(
      raw.map((item) => {
        const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
        return [key, item[valueKey]];
      }),
    );

    return monthBuckets.map((bucket) => ({
      label: bucket.label,
      month: bucket.label,
      amount: lookup.get(bucket.key) || 0,
      value: lookup.get(bucket.key) || 0,
    }));
  };

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfToday.getDate() + 1);

  const dealTerminalStatuses = ['Converted', 'Closed Won', 'Closed Lost', 'Not Interested'];

  const [
    companiesTotal,
    usersTotal,
    customersTotal,
    leadsTotal,
    ordersTotal,
    ticketsTotal,
    activitiesTotal,
    notificationsUnread,
    leadsByStatus,
    leadsBySource,
    leadTrendRaw,
    customerTrendRaw,
    customersActive,
    customersInactive,
    dealsTotal,
    dealsByStatus,
    dealTrendRaw,
    recentLeads,
    recentCustomers,
    recentActivities,
    dealsWonTotal,
    dealRevenueRaw,
    pendingActivitiesTotal,
    employeeLeadsTotal,
    employeeFollowupsToday,
    employeeDealsInProgress,
    employeeTasksPlanned,
    employeePriorityLeads,
    employeePriorityTickets,
    employeeActiveDeals,
    billingTicketsTotal,
    unpaidDealsCount,
    unpaidDealsValue,
    wonDealsAwaitingBilling,
    vipCustomersTotal,
    overdueOrdersCount,
    overdueOrdersValue,
    revenueTrendRaw,
    topPerformersRaw,
    employeeTicketsTotal,
    overdueLeadsCount,
  ] = await Promise.all([
    Company.countDocuments(companyQuery),
    User.countDocuments(userFilter),
    Customer.countDocuments(customerFilter),
    Lead.countDocuments(leadFilter),
    Order.countDocuments(companyFilter),
    SupportTicket.countDocuments(companyFilter),
    Activity.countDocuments(companyFilter),
    Notification.countDocuments({ ...companyFilter, is_read: false }),
    Lead.aggregate([
      { $match: leadFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { _id: 0, status: { $ifNull: ['$_id', ''] }, count: 1 } },
    ]),
    Lead.aggregate([
      { $match: leadFilter },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
      { $project: { _id: 0, source: { $ifNull: ['$_id', ''] }, count: 1 } },
    ]),
    Lead.aggregate([
      { $match: { ...leadFilter, created_at: { $gte: trendStartDate } } },
      {
        $group: {
          _id: { year: { $year: '$created_at' }, month: { $month: '$created_at' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Customer.aggregate([
      { $match: { ...customerFilter, created_at: { $gte: trendStartDate } } },
      {
        $group: {
          _id: { year: { $year: '$created_at' }, month: { $month: '$created_at' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Customer.countDocuments({ ...customerFilter, status: 'Active' }),
    Customer.countDocuments({ ...customerFilter, status: 'Inactive' }),
    Deal.countDocuments(dealFilter),
    Deal.aggregate([
      { $match: dealFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { _id: 0, status: { $ifNull: ['$_id', ''] }, count: 1 } },
    ]),
    Deal.aggregate([
      { $match: { ...dealFilter, created_at: { $gte: trendStartDate } } },
      {
        $group: {
          _id: { year: { $year: '$created_at' }, month: { $month: '$created_at' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Lead.find(isEmployee && employeeLeadFilter ? employeeLeadFilter : leadFilter)
      .sort({ created_at: -1 })
      .limit(5)
      .select('name status source created_at'),
    Customer.find(customerFilter).sort({ created_at: -1 }).limit(5).select('name email phone created_at'),
    Activity.find(isEmployee && employeeActivityFilter ? employeeActivityFilter : companyFilter)
      .sort({ created_at: -1 })
      .limit(5)
      .select('activity_type description status activity_date due_date created_at related_type'),
    Deal.countDocuments({ ...dealFilter, status: { $in: ['Converted', 'Closed Won'] } }),
    Deal.aggregate([
      { $match: { ...dealFilter, status: { $in: ['Converted', 'Closed Won'] } } },
      { $group: { _id: null, total: { $sum: '$value' } } }
    ]),
    Activity.countDocuments({ ...companyFilter, status: 'planned' }),
    isEmployee && employeeLeadFilter ? Lead.countDocuments(employeeLeadFilter) : 0,
    isEmployee && employeeLeadFilter
      ? Lead.countDocuments({ ...employeeLeadFilter, follow_up_date: { $gte: startOfToday, $lt: startOfTomorrow } })
      : 0,
    isEmployee && employeeDealFilter
      ? Deal.countDocuments({ ...employeeDealFilter, status: { $nin: dealTerminalStatuses } })
      : 0,
    isEmployee && employeeActivityFilter
      ? Activity.countDocuments({ ...employeeActivityFilter, status: 'planned', activity_type: 'task' })
      : 0,
    isEmployee && employeeLeadFilter
      ? Lead.find({ 
          ...employeeLeadFilter, 
          status: { $ne: 'Converted' },
          follow_up_date: { $exists: true, $lte: startOfTomorrow }
        })
        .sort({ follow_up_date: 1 })
        .limit(5)
        .select('name status follow_up_date source')
      : [],
    isEmployee && userObjectId
      ? SupportTicket.find({
          assigned_to: userObjectId,
          status: { $in: ['open', 'in-progress'] }
        })
        .sort({ priority: -1, created_at: 1 })
        .limit(5)
        .select('subject ticket_id priority status created_at')
      : [],
    isEmployee && employeeDealFilter
      ? Deal.find({ ...employeeDealFilter, status: { $nin: dealTerminalStatuses } })
        .sort({ updated_at: -1 })
        .limit(5)
        .populate('customer_id', 'name')
      : [],
    SupportTicket.countDocuments({ ...companyFilter, category: 'Billing', status: { $ne: 'resolved' } }),
    Deal.countDocuments({ ...dealFilter, status: { $in: ['Won', 'won', 'Converted', 'Closed Won'] }, is_paid: { $ne: true } }),
    Deal.aggregate([
      { $match: { ...dealFilter, status: { $in: ['won', 'Won', 'Converted', 'Closed Won'] }, is_paid: { $ne: true } } },
      { $group: { _id: null, total: { $sum: '$value' } } }
    ]),
    Deal.find({ ...dealFilter, status: { $in: ['won', 'Won', 'Converted', 'Closed Won'] }, is_paid: { $ne: true } })
      .sort({ updated_at: -1 })
      .limit(5)
      .populate('customer_id', 'name'),
    Customer.countDocuments({ ...customerFilter, is_vip: true }),
    Order.countDocuments({ ...companyFilter, status: 'pending', due_date: { $lt: new Date() } }),
    Order.aggregate([
      { $match: { ...companyFilter, status: 'pending', due_date: { $lt: new Date() } } },
      { $group: { _id: null, total: { $sum: '$total_amount' } } }
    ]),
    Deal.aggregate([
      { $match: { ...dealFilter, status: { $in: ['Won', 'won', 'Converted', 'Closed Won'] }, created_at: { $gte: trendStartDate } } },
      {
        $group: {
          _id: { year: { $year: '$created_at' }, month: { $month: '$created_at' } },
          amount: { $sum: '$value' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]),
    Deal.aggregate([
      { $match: { ...dealFilter, status: { $in: ['Won', 'won', 'Converted', 'Closed Won'] } } },
      {
        $group: {
          _id: '$assigned_to',
          revenue: { $sum: '$value' },
          count: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 3 }
    ]),
    isEmployee && userObjectId ? SupportTicket.countDocuments({ assigned_to: userObjectId }) : 0,
    Lead.countDocuments({ ...leadFilter, status: { $ne: 'Converted' }, follow_up_date: { $lt: startOfToday } }),
  ]);

  const revenueTotal = (dealRevenueRaw[0]?.total || 0);

  res.json({
    companies: { total: companiesTotal },
    users: { total: usersTotal },
    orders: { total: ordersTotal },
    supportTickets: { total: ticketsTotal },
    activities: { total: activitiesTotal },
    notifications: { unread: notificationsUnread },
    customers: { 
      total: customersTotal, 
      active: customersActive,
      inactive: customersInactive,
      recent: recentCustomers, 
      trend: fillTrend(customerTrendRaw),
      vipTotal: vipCustomersTotal
    },
    leads: {
      total: leadsTotal,
      byStatus: leadsByStatus,
      bySource: leadsBySource,
      trend: fillTrend(leadTrendRaw),
      recent: recentLeads,
      overdueCount: overdueLeadsCount || 0,
    },
    deals: {
      total: dealsTotal,
      byStatus: dealsByStatus,
      trend: fillTrend(dealTrendRaw),
      revenueTrend: fillTrend(revenueTrendRaw, 'amount'),
    },
    topPerformers: await Promise.all((topPerformersRaw || []).map(async p => {
      const user = await User.findById(p._id).select('name role profile_photo');
      return {
        ...p,
        name: user?.name || 'Unknown',
        role: user?.role || 'Employee'
      };
    })),
    activities: {
      total: activitiesTotal,
      pending: pendingActivitiesTotal,
      recent: recentActivities,
    },
    employee: isEmployee
      ? {
          leadsTotal: employeeLeadsTotal,
          followupsToday: employeeFollowupsToday,
          dealsInProgress: employeeDealsInProgress,
          activeDeals: employeeActiveDeals,
          tasksPlanned: employeeTasksPlanned,
          ticketsTotal: employeeTicketsTotal,
          priorityItems: [
            ...(employeePriorityLeads || []).map(l => ({ ...l.toObject(), type: 'lead' })),
            ...(employeePriorityTickets || []).map(t => ({ ...t.toObject(), type: 'ticket' }))
          ].sort((a, b) => new Date(a.activity_date || a.follow_up_date || a.created_at) - new Date(b.activity_date || b.follow_up_date || b.created_at))
        }
      : undefined,
    summary: {
      totalLeads: leadsTotal,
      dealsWon: dealsWonTotal,
      pendingTasks: pendingActivitiesTotal,
      totalRevenue: (dealRevenueRaw[0]?.total || 0),
    },
    financials: {
      unpaidCount: unpaidDealsCount || 0,
      unpaidValue: unpaidDealsValue[0]?.total || 0,
      billingTicketsOutstanding: billingTicketsTotal || 0,
      awaitingBillingDeals: wonDealsAwaitingBilling,
      overdueCount: overdueOrdersCount || 0,
      overdueValue: overdueOrdersValue[0]?.total || 0,
    }
  });
});

exports.getTeamPerformance = asyncHandler(async (req, res) => {
  const companyId = req.user.company_id ? new mongoose.Types.ObjectId(req.user.company_id) : new mongoose.Types.ObjectId();
  const currentUserId = new mongoose.Types.ObjectId(req.user.id);
  const isAdmin = req.user.role === 'Admin';

  // 1. Get all employees in the team
  const employeeFilter = {
    company_id: companyId,
    role: 'Employee',
    status: 'active'
  };

  // If Manager, only show their direct reports
  if (!isAdmin) {
    employeeFilter.manager_id = currentUserId;
  }

  const employees = await User.find(employeeFilter).select('name email username profile_photo');
  const employeeIds = employees.map(e => e._id);

  // 2. Aggregate metrics per employee
  const [leadStats, dealStats, taskStats, ticketStats] = await Promise.all([
    // Lead stats (Total and Converted)
    Lead.aggregate([
      { $match: { company_id: companyId, assigned_to: { $in: employeeIds } } },
      {
        $group: {
          _id: '$assigned_to',
          totalLeads: { $sum: 1 },
          convertedLeads: {
            $sum: { $cond: [{ $eq: ['$status', 'Converted'] }, 1, 0] }
          }
        }
      }
    ]),
    // Deal stats (Won)
    Deal.aggregate([
      { 
        $match: { 
          company_id: companyId, 
          assigned_to: { $in: employeeIds },
          status: { $in: ['Converted', 'Closed Won', 'won'] } 
        } 
      },
      {
        $group: {
          _id: '$assigned_to',
          dealsWon: { $sum: 1 },
          wonValue: { $sum: '$value' }
        }
      }
    ]),
    // Task stats (Pending/Planned tasks)
    Activity.aggregate([
      { 
        $match: { 
          company_id: companyId, 
          created_by: { $in: employeeIds },
          status: 'planned',
          activity_type: 'task'
        } 
      },
      {
        $group: {
          _id: '$created_by',
          pendingTasks: { $sum: 1 }
        }
      }
    ]),
    // Support Ticket stats
    SupportTicket.aggregate([
      { 
        $match: { 
          company_id: companyId, 
          assigned_to: { $in: employeeIds },
          status: { $ne: 'resolved' }
        } 
      },
      {
        $group: {
          _id: '$assigned_to',
          activeTickets: { $sum: 1 },
          escalatedTickets: {
            $sum: { $cond: [{ $eq: ['$is_escalated', true] }, 1, 0] }
          }
        }
      }
    ])
  ]);

  // 3. Merge stats with employee objects
  const performance = employees.map(emp => {
    const lStat = leadStats.find(s => String(s._id) === String(emp._id)) || {};
    const dStat = dealStats.find(s => String(s._id) === String(emp._id)) || {};
    const tStat = taskStats.find(s => String(s._id) === String(emp._id)) || {};
    const sStat = ticketStats.find(s => String(s._id) === String(emp._id)) || {};

    const totalLeads = lStat.totalLeads || 0;
    const convertedLeads = lStat.convertedLeads || 0;

    return {
      ...emp.toObject(),
      totalLeads,
      convertedLeads,
      dealsWon: dStat.dealsWon || 0,
      wonValue: dStat.wonValue || 0,
      pendingTasks: tStat.pendingTasks || 0,
      activeTickets: sStat.activeTickets || 0,
      escalatedTickets: sStat.escalatedTickets || 0,
      conversionRate: totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0
    };
  });

  // Calculate team-wide totals
  const teamTotals = {
    totalEmployees: employees.length,
    totalLeads: performance.reduce((sum, p) => sum + p.totalLeads, 0),
    totalConverted: performance.reduce((sum, p) => sum + p.convertedLeads, 0),
    totalDealsWon: performance.reduce((sum, p) => sum + p.dealsWon, 0),
    totalWonValue: performance.reduce((sum, p) => sum + p.wonValue, 0),
    totalPendingTasks: performance.reduce((sum, p) => sum + p.pendingTasks, 0),
    totalActiveTickets: performance.reduce((sum, p) => sum + p.activeTickets, 0),
    totalEscalatedTickets: performance.reduce((sum, p) => sum + p.escalatedTickets, 0)
  };

  res.ok({
    performance,
    summary: teamTotals
  });
});
