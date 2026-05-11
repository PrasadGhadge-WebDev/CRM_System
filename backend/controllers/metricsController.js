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
const Payment = require('../models/Payment');
const { asyncHandler } = require('../middleware/asyncHandler');

exports.getMetrics = asyncHandler(async (req, res) => {
  const isGlobalAdmin = req.user?.role === 'Admin' && !req.user?.company_id;
  const isEmployee = req.user?.role === 'Employee';

  if (!isGlobalAdmin && !req.user?.company_id) {
    req.user.company_id = new mongoose.Types.ObjectId();
  }

  const queryCompanyId = req.user.company_id ? new mongoose.Types.ObjectId(req.user.company_id) : null;
  const companyFilter = { company_id: queryCompanyId };
  
  const leadFilter = { ...companyFilter, isDeleted: { $ne: true } };
  const customerFilter = { ...companyFilter, isDeleted: { $ne: true } };
  const dealFilter = { ...companyFilter, isDeleted: { $ne: true } };
  const userFilter = {
    ...companyFilter,
    status: 'active',
    is_demo: { $ne: true },
    is_trial: { $ne: true },
  };

  const userObjectId = req.user?._id ? new mongoose.Types.ObjectId(req.user._id) : null;
  const employeeLeadFilter = isEmployee && userObjectId ? { ...leadFilter, assignedTo: userObjectId } : null;
  const employeeDealFilter = isEmployee && userObjectId ? { ...dealFilter, assigned_to: userObjectId } : null;
  const employeeActivityFilter = isEmployee && userObjectId ? { ...companyFilter, createdBy: userObjectId } : null;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfToday.getDate() + 1);

  const results = await Promise.all([
    Company.countDocuments(queryCompanyId ? { _id: queryCompanyId } : { _id: null }), // 0
    User.countDocuments(userFilter), // 1
    Customer.countDocuments(customerFilter), // 2
    Lead.countDocuments(leadFilter), // 3
    SupportTicket.countDocuments(companyFilter), // 4
    Activity.countDocuments(companyFilter), // 5
    Notification.countDocuments({ ...companyFilter, is_read: false }), // 6
    Deal.countDocuments(dealFilter), // 7
    
    // Employee Specific Counts
    isEmployee ? Lead.countDocuments(employeeLeadFilter) : 0, // 8
    isEmployee ? Lead.countDocuments({ ...employeeLeadFilter, status: 'New' }) : 0, // 9
    isEmployee ? Lead.countDocuments({ ...employeeLeadFilter, status: 'Follow-up' }) : 0, // 10
    isEmployee ? Deal.countDocuments({ ...employeeDealFilter, stage: { $ne: 'Lost' } }) : 0, // 11
    isEmployee ? Deal.countDocuments({ ...employeeDealFilter, stage: 'Won' }) : 0, // 12
    isEmployee ? Deal.countDocuments({ ...employeeDealFilter, stage: 'Lost' }) : 0, // 13
    isEmployee ? SupportTicket.countDocuments({ assigned_to: userObjectId, status: { $ne: 'closed' } }) : 0, // 14
    isEmployee ? SupportTicket.countDocuments({ assigned_to: userObjectId, status: 'closed' }) : 0, // 15
    isEmployee ? Payment.countDocuments({ collected_by: userObjectId, status: 'Pending' }) : 0, // 16
    
    // Employee Specific Lists
    isEmployee ? Activity.find({ ...employeeActivityFilter, activity_date: { $gte: startOfToday, $lt: startOfTomorrow } }).sort({ activity_date: 1 }) : [], // 17
    isEmployee ? Lead.find(employeeLeadFilter).sort({ created_at: -1 }).limit(5).select('name status nextFollowupDate') : [], // 18
    isEmployee ? Deal.find({ ...employeeDealFilter, stage: { $ne: 'Lost' } }).sort({ updated_at: -1 }).limit(5).populate('customer_id', 'name') : [], // 19
    isEmployee ? Payment.find({ collected_by: userObjectId, status: 'Pending' }).sort({ payment_date: 1 }).limit(5).populate('customer_id', 'name') : [], // 20
    isEmployee ? SupportTicket.find({ assigned_to: userObjectId }).sort({ created_at: -1 }).limit(5).populate('customer_id', 'name') : [], // 21
    
    // General Lists & Totals
    Lead.find(leadFilter).sort({ created_at: -1 }).limit(5).select('name status source created_at'), // 22
    Activity.find(companyFilter).sort({ created_at: -1 }).limit(5), // 23
    Deal.aggregate([{ $match: { ...dealFilter, stage: 'Won' } }, { $group: { _id: null, total: { $sum: '$value' } } }]), // 24
    Activity.countDocuments({ ...companyFilter, status: 'planned' }), // 25
    Lead.countDocuments({ ...leadFilter, status: { $nin: ['Converted', 'Lost'] }, nextFollowupDate: { $lt: startOfToday } }), // 26
  ]);

  const [
    companiesTotal, usersTotal, customersTotal, leadsTotal, ticketsTotal, activitiesTotal, notificationsUnread, dealsTotal,
    empLeadsTotal, empLeadsNew, empLeadsFollowup, empDealsActive, empDealsWon, empDealsLost, empTicketsOpen, empTicketsClosed, empPaymentsPending,
    empTasksToday, empLeadsRecent, empDealsRecent, empPaymentsRecent, empTicketsRecent,
    recentLeads, recentActivities, revenueRaw, pendingActivitiesTotal, overdueLeadsCount
  ] = results;

  res.json({
    companies: { total: companiesTotal },
    users: { total: usersTotal },
    supportTickets: { total: ticketsTotal },
    activities: { total: activitiesTotal },
    notifications: { unread: notificationsUnread },
    customers: { total: customersTotal },
    leads: { total: leadsTotal, recent: recentLeads, overdueCount: overdueLeadsCount },
    deals: { total: dealsTotal },
    summary: { 
      totalRevenue: revenueRaw[0]?.total || 0,
      pendingTasks: pendingActivitiesTotal
    },
    financials: {
      unpaidValue: 0 // Placeholder
    },
    employee: isEmployee ? {
      leads: { total: empLeadsTotal, new: empLeadsNew, followup: empLeadsFollowup },
      deals: { active: empDealsActive, won: empDealsWon, lost: empDealsLost },
      payments: { pending: empPaymentsPending, overdue: 0, recent: empPaymentsRecent },
      tickets: { total: empTicketsOpen + empTicketsClosed, open: empTicketsOpen, closed: empTicketsClosed, recent: empTicketsRecent },
      tasks: { today: empTasksToday, planned: empTasksToday.length },
      leadsRecent: empLeadsRecent,
      dealsRecent: empDealsRecent,
      performance: { 
        conversions: empDealsWon, 
        closedDeals: empDealsWon, 
        followupCount: empLeadsFollowup,
        targetProgress: Math.min(100, Math.round((empDealsWon / 10) * 100)) // Mock target of 10 deals
      }
    } : undefined
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
