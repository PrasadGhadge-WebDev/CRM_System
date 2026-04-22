const Lead = require('../models/Lead');
const LeadNote = require('../models/LeadNote');
const User = require('../models/User');
const DemoUser = require('../models/DemoUser');
const Counter = require('../models/Counter');
const mongoose = require('mongoose');
const { asyncHandler } = require('../middleware/asyncHandler');
const { moveDocumentToTrash } = require('../utils/trash');
const { notifyRoleUsers } = require('../utils/notifier');
const ExcelJS = require('exceljs');

function getAuthUserModelName(req) {
  return req?.user?.constructor?.modelName === 'DemoUser' ? 'DemoUser' : 'User';
}

async function findActiveCompanyUserById(companyId, userId) {
  const normalizedId = normalizeObjectId(userId);
  if (!normalizedId || !mongoose.Types.ObjectId.isValid(normalizedId)) return null;

  const query = { _id: normalizedId, company_id: companyId, status: 'active' };
  const user = await User.findOne(query).select('_id');
  if (user) return { model: 'User', user };

  const demoUser = await DemoUser.findOne(query).select('_id');
  if (demoUser) return { model: 'DemoUser', user: demoUser };

  return null;
}

function buildSearchQuery(q) {
  if (!q) return null;
  const safe = String(q).trim();
  if (!safe) return null;
  return { $regex: safe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
}

function normalizeObjectId(value) {
  if (value == null) return null;
  if (typeof value === 'object') value = value.id || value._id || value.value;
  const asString = String(value).trim();
  if (!asString || asString === 'undefined' || asString === 'null') return null;
  return asString.replace(/:\d+$/, '');
}

async function getNextLeadId(companyId) {
  const counter = await Counter.findOneAndUpdate(
    { company_id: companyId, model: 'Lead', field: 'leadId' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${counter.prefix}${counter.seq}`;
}

function validateLead(payload) {
  const errors = [];
  if (!payload.firstName && !payload.first_name) errors.push('First name is required');
  if (!payload.lastName && !payload.last_name) errors.push('Last name is required');
  if (!payload.email) {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    errors.push('Invalid email format');
  }
  if (payload.phone && !/^\d{10,15}$/.test(payload.phone.replace(/\D/g, ''))) {
    errors.push('Phone must be between 10-15 digits');
  }
  if (!payload.status) errors.push('Status is required');
  if (!payload.source) errors.push('Source is required');
  if (!payload.assignedTo && !payload.assigned_to && !payload.autoAssign) errors.push('Assignee is required');
  // Removed strict requirement for dealAmount and notes
  return errors;
}

async function notifyAccountantsOfConversion(companyId, lead) {
  if (!companyId || !lead) return;

  const title = 'Lead Converted';
  const message = `Lead ${lead.name || lead.readable_id || lead._id} has been converted. Please review invoice and payment processing.`;
  await notifyRoleUsers({
    company_id: companyId,
    role: 'Accountant',
    title,
    message,
    linked_entity_id: lead._id,
    linked_entity_type: 'Lead',
    send_email: false,
  });
}

exports.listLeads = asyncHandler(async (req, res, next) => {

  const {
    status,
    source,
    assignedTo,
    startDate,
    endDate,
    followupDate,
    q,
    page = 1,
    limit = 20,
    sortField = 'created_at',
    sortOrder = 'desc',
    all
  } = req.query;

  if (req.user?.role === 'Accountant') {
    return res.fail('Accountants do not have access to the Leads module', 403);
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const sort = { [sortField]: sortOrder === 'desc' ? -1 : 1 };

  const search = buildSearchQuery(q);
  const filter = {
    company_id: new mongoose.Types.ObjectId(req.user.company_id),
    isDeleted: { $ne: true }
  };

  if (req.user?.role === 'Employee') {
    filter.assignedTo = new mongoose.Types.ObjectId(req.user.id);
  } else if (assignedTo) {
    filter.assignedTo = new mongoose.Types.ObjectId(assignedTo);
  }

  if (status) filter.status = status;
  if (source) filter.source = source;

  if (startDate || endDate) {
    filter.created_at = {};
    if (startDate) filter.created_at.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.created_at.$lte = end;
    }
  }

  if (followupDate) {
    const start = new Date(followupDate);
    if (!Number.isNaN(start.getTime())) {
      const end = new Date(start);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      filter.nextFollowupDate = { $gte: start, $lte: end };
    }
  }

  if (search) filter.$or = [{ name: search }, { email: search }, { phone: search }, { source: search }, { company: search }];

  const now = new Date();
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
  const endOfToday = new Date(new Date().setHours(23, 59, 59, 999));

  // Main Items Aggregation
  const itemsPipeline = [
    { $match: filter },
    {
      $addFields: {
        urgencyScore: {
          $switch: {
            branches: [
              // 1. Overdue: nextFollowupDate is before today
              {
                case: {
                  $and: [
                    { $ifNull: ["$nextFollowupDate", false] },
                    { $lt: ["$nextFollowupDate", startOfToday] }
                  ]
                },
                then: 1
              },
              // 2. Due Today: nextFollowupDate is within today
              {
                case: {
                  $and: [
                    { $gte: ["$nextFollowupDate", startOfToday] },
                    { $lte: ["$nextFollowupDate", endOfToday] }
                  ]
                },
                then: 2
              },
              // 3. Upcoming: nextFollowupDate is in future
              {
                case: { $gt: ["$nextFollowupDate", endOfToday] },
                then: 3
              }
            ],
            default: 4 // No planned follow-up
          }
        }
      }
    },
    // Final Sort Logic
    {
      $sort: {
        urgencyScore: 1, // Bucket 1-4
        nextFollowupDate: 1, // Within bucket, earliest first
        updated_at: -1 // Finally recent changes
      }
    },
    { $skip: (pageNum - 1) * limitNum },
    { $limit: limitNum },
    {
      $addFields: {
        assignedToModel: { $ifNull: ['$assignedToModel', 'User'] },
      }
    },
    {
      $lookup: {
        from: 'customers',
        localField: 'convertedCustomerId',
        foreignField: '_id',
        as: 'convertedCustomerId'
      }
    },
    { $unwind: { path: '$convertedCustomerId', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        id: '$_id'
      }
    }
  ];

  // Summary Aggregation
  const summaryPipeline = [
    { $match: filter },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        converted: { $sum: { $cond: [{ $eq: ['$status', 'Converted'] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $and: [{ $ne: ['$status', 'Converted'] }, { $ne: ['$status', 'Lost'] }] }, 1, 0] } },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $lt: ['$nextFollowupDate', startOfToday] },
                  { $ne: ['$status', 'Converted'] },
                  { $ne: ['$status', 'Lost'] }
                ]
              },
              1, 0
            ]
          }
        }
      }
    }
  ];

  const [items, totalFiltered, summary] = await Promise.all([
    Lead.aggregate(itemsPipeline),
    Lead.countDocuments(filter),
    Lead.aggregate(summaryPipeline)
  ]);

  await Lead.populate(items, { path: 'assignedTo', select: 'name email role' });

  const stats = summary[0] || { total: 0, converted: 0, pending: 0, overdue: 0 };
  if (summary[0]) delete stats._id;

  res.ok({ items, page: pageNum, limit: limitNum, total: totalFiltered, summary: stats });
});



exports.exportLeadsExcel = asyncHandler(async (req, res, next) => {

  if (req.user?.role === 'Accountant') {
    return res.fail('Accountants do not have access to the Leads module', 403);
  }

  const {
    status,
    source,
    assignedTo,
    startDate,
    endDate,
    q,
  } = req.query;

  const search = buildSearchQuery(q);
  const filter = { company_id: req.user.company_id };
  if (req.user?.role === 'Employee') {
    filter.assignedTo = req.user.id;
  }
  if (status) filter.status = status;
  if (source) filter.source = source;
  if (assignedTo && req.user?.role !== 'Employee') filter.assignedTo = assignedTo;

  if (startDate || endDate) {
    filter.created_at = {};
    if (startDate) filter.created_at.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.created_at.$lte = end;
    }
  }

  if (search) filter.$or = [{ name: search }, { email: search }, { phone: search }, { source: search }];

  const leads = await Lead.find(filter)
    .populate('assignedTo', 'name email')
    .sort({ created_at: -1 })
    ;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Leads');

  worksheet.columns = [
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Source', key: 'source', width: 15 },
    { header: 'City', key: 'city', width: 15 },
    { header: 'Owner', key: 'owner', width: 20 },
    { header: 'Last Contact', key: 'last_contact', width: 15 },
    { header: 'Next Follow-up', key: 'next_followup', width: 15 },
    { header: 'Created At', key: 'created_at', width: 20 },
    { header: 'Follow-up Date', key: 'follow_up', width: 15 },
  ];

  leads.forEach(l => {
    worksheet.addRow({
      name: l.name,
      email: l.email,
      phone: l.phone,
      status: l.status,
      source: l.source,
      city: l.city,
      owner: l.assignedTo?.name || 'Unassigned',
      last_contact: l.lastContactDate ? new Date(l.lastContactDate).toLocaleDateString() : '',
      next_followup: l.nextFollowupDate ? new Date(l.nextFollowupDate).toLocaleDateString() : '',
      created_at: l.created_at ? new Date(l.created_at).toLocaleString() : '',
      follow_up: l.followUpDate ? new Date(l.followUpDate).toLocaleDateString() : '',
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="leads-report.xlsx"');

  await workbook.xlsx.write(res);
  res.end();
});

exports.createLead = asyncHandler(async (req, res, next) => {
  const payload = req.body || {};
  if (req.user?.role === 'Accountant') {
    return res.fail('Accountants do not have access to the Leads module', 403);
  }

  try {
    payload.assignedTo = normalizeObjectId(payload.assignedTo || payload.assigned_to);
    if (payload.assignedTo) {
      if (!mongoose.Types.ObjectId.isValid(payload.assignedTo)) {
        return res.fail('Invalid assignee user id', 400);
      }
    } else {
      delete payload.assignedTo;
      delete payload.assigned_to;
      if (req.user?.role === 'Employee') {
        payload.assignedTo = req.user.id;
        payload.assignedToModel = getAuthUserModelName(req);
      } else {
        payload.autoAssign = true;
      }
    }

    const validationErrors = validateLead(payload);
    if (validationErrors.length > 0) {
      return res.fail(validationErrors.join(', '), 400);
    }

    payload.company_id = req.user.company_id;
    payload.createdBy = req.user.id;
    payload.createdByModel = getAuthUserModelName(req);

    payload.firstName = String(payload.firstName || payload.first_name || '').trim();
    payload.lastName = String(payload.lastName || payload.last_name || '').trim();
    payload.name = `${payload.firstName} ${payload.lastName}`.trim() || payload.name;
    payload.company = payload.company || payload.company_name || '';

    if (payload.dealAmount == null) {
      payload.dealAmount = Number(payload.estimated_value || payload.budget || 0);
    }

    // ── Normalize contact fields before duplicate check ──────────────────────
    const normalizedEmail = payload.email ? String(payload.email).trim().toLowerCase() : null;
    const normalizedPhone = payload.phone ? String(payload.phone).replace(/\D/g, '') : null;

    if (normalizedEmail) payload.email = normalizedEmail;
    if (normalizedPhone) payload.phone = normalizedPhone;

    // ── Duplicate Check: email OR phone within same company ──────────────────
    const dupConditions = [];
    if (normalizedEmail) dupConditions.push({ email: normalizedEmail });
    if (normalizedPhone) dupConditions.push({ phone: normalizedPhone });

    if (dupConditions.length > 0) {
      const existing = await Lead.findOne({
        company_id: req.user.company_id,
        isDeleted: { $ne: true },
        $or: dupConditions,
      }).select('_id leadId name email phone status');

      if (existing) {
        const matchedFields = [];
        if (normalizedEmail && existing.email === normalizedEmail) matchedFields.push('email');
        if (normalizedPhone && existing.phone === normalizedPhone) matchedFields.push('phone');

        const { logActivity } = require('../utils/activityLogger');
        await logActivity({
          company_id: req.user.company_id,
          user_id: req.user.id,
          user_model: getAuthUserModelName(req),
          description: `Duplicate lead blocked — matched by ${matchedFields.join(' & ')} for "${payload.name}"`,
          related_to: existing._id,
          related_type: 'Lead',
        }).catch(() => { });

        return res.status(409).json({
          success: false,
          duplicate: true,
          message: `A lead with this ${matchedFields.join(' & ')} already exists`,
          existing: {
            id: existing.id || existing._id,
            leadId: existing.leadId,
            name: existing.name,
            status: existing.status
          }
        });
      }
    }

    // ── Assign user ──────────────────────────────────────────────────────────
    if (req.user.role === 'Employee') {
      payload.assignedTo = req.user.id;
      payload.assignedToModel = getAuthUserModelName(req);
    } else if (payload.assignedTo) {
      const resolved = await findActiveCompanyUserById(req.user.company_id, payload.assignedTo);
      if (!resolved) {
        return res.fail('Assigned user not found or inactive', 404);
      }
      payload.assignedToModel = resolved.model;
    }

    if (!payload.assignedTo) {
      const { getNextRoundRobinUser } = require('../utils/assignment');
      const autoAssigneeId = await getNextRoundRobinUser(req.user.company_id);
      if (autoAssigneeId) {
        payload.assignedTo = autoAssigneeId;
        payload.assignedToModel = 'User';
      }
    }

    if (!payload.assignedTo) {
      return res.fail('Assignee is required', 400);
    }

    if (!payload.leadId) {
      payload.leadId = await getNextLeadId(req.user.company_id);
    }

    const created = await Lead.create(payload);

    const { logActivity } = require('../utils/activityLogger');
    await logActivity({
      company_id: req.user.company_id,
      user_id: req.user.id,
      user_model: getAuthUserModelName(req),
      description: `New lead created: ${created.name}`,
      related_to: created._id,
      related_type: 'Lead'
    });

    return res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      data: created
    });
  } catch (err) {
    console.error('Create Lead Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during lead creation',
      error: err.message
    });
  }
});


exports.getLead = asyncHandler(async (req, res, next) => {

  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.fail('Invalid lead ID format', 400);
  }

  const lead = await Lead.findOne({ _id: id, company_id: req.user.company_id })
    .populate('assignedTo', 'name email')
    .populate('convertedCustomerId', 'customer_id name phone status created_at total_purchase_amount');
  if (!lead) {
    return res.fail('Lead not found', 404);
  }
  res.ok(lead);
});

exports.updateLead = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const payload = req.body || {};

  if (req.user?.role === 'Accountant') {
    return res.fail('Accountants do not have access to the Leads module', 403);
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: `Invalid lead ID format: ${id}` });
    }

    // Bridge old snake_case fields if provided
    if (payload.first_name && !payload.firstName) payload.firstName = payload.first_name;
    if (payload.last_name && !payload.lastName) payload.lastName = payload.last_name;
    if (payload.assigned_to && !payload.assignedTo) payload.assignedTo = payload.assigned_to;
    if (payload.estimated_value && !payload.dealAmount) payload.dealAmount = payload.estimated_value;
    if (payload.follow_up_date && !payload.followUpDate) payload.followUpDate = payload.follow_up_date;

    const { status } = payload;

    // 1. Role-based security for Employees
    if (req.user?.role === 'Employee') {
      const lead = await Lead.findOne({ _id: id, company_id: req.user.company_id }).select('assignedTo');
      if (!lead) return res.fail('Lead not found', 404);
      if (!lead.assignedTo || String(lead.assignedTo) !== String(req.user.id)) {
        return res.fail('You can only update leads assigned to you', 403);
      }

      // Employees can only update specific fields
      const allowed = ['status', 'followUpDate', 'notes', 'city', 'state', 'pincode', 'priority'];
      for (const key of Object.keys(payload)) {
        if (!allowed.includes(key)) delete payload[key];
      }
    }

    // Validate assignee changes (avoid CastErrors becoming 500s)
    if (payload.assignedTo || payload.assigned_to) {
      const normalizedAssignedTo = normalizeObjectId(payload.assignedTo || payload.assigned_to);
      if (!normalizedAssignedTo) {
        delete payload.assignedTo;
        delete payload.assigned_to;
        delete payload.assignedToModel;
      } else {
        if (!mongoose.Types.ObjectId.isValid(normalizedAssignedTo)) {
          return res.fail('Invalid assignee user id', 400);
        }
        const resolved = await findActiveCompanyUserById(req.user.company_id, normalizedAssignedTo);
        if (!resolved) {
          return res.fail('Assigned user not found or inactive', 404);
        }
        payload.assignedTo = normalizedAssignedTo;
        payload.assignedToModel = resolved.model;
        delete payload.assigned_to;
      }
    }

    // 2. Conversion Logic
    if (payload.status === 'Converted') {
      const { performLeadConversion } = require('../utils/leadConversion');
      await performLeadConversion(id, req.user.company_id, req.user.id, getAuthUserModelName(req));

      const lead = await Lead.findOne({ _id: id, company_id: req.user.company_id })
        .populate('assignedTo', 'name email')
        .populate('convertedCustomerId', 'customer_id name phone status created_at total_purchase_amount');

      await notifyAccountantsOfConversion(req.user.company_id, lead);
      return res.ok(lead, 'Lead converted to Customer profile successfully');
    }

    const oldLead = await Lead.findOne({ _id: id, company_id: req.user.company_id });
    if (!oldLead) return res.fail('Lead not found', 404);

    // Normalize name if first/last name changed
    if (payload.firstName || payload.lastName) {
      const fn = payload.firstName || oldLead.firstName || '';
      const ln = payload.lastName || oldLead.lastName || '';
      payload.name = `${fn} ${ln}`.trim();
    }

    // Protected fields
    delete payload.company_id;
    delete payload.createdBy;
    delete payload.convertedCustomerId;
    delete payload.leadId;
    delete payload._id;
    delete payload.id;

    const updated = await Lead.findOneAndUpdate(
      { _id: id, company_id: req.user.company_id },
      payload,
      { new: true, runValidators: true }
    );

    if (updated && status && status !== oldLead.status) {
      const { logActivity } = require('../utils/activityLogger');
      await logActivity({
        company_id: req.user.company_id,
        user_id: req.user.id,
        user_model: getAuthUserModelName(req),
        description: `Status updated from ${oldLead.status} to ${status}`,
        related_to: updated._id,
        related_type: 'Lead'
      });
    }

    return res.ok(updated);
  } catch (err) {
    console.error('Update Lead Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during lead update',
      error: err.message
    });
  }
});

exports.updateLeadStatus = asyncHandler(async (req, res, next) => {

  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.fail('Status is required', 400);
  }

  const oldLead = await Lead.findOne({ _id: id, company_id: req.user.company_id });
  if (!oldLead) {
    return res.fail('Lead not found', 404);
  }

  if (status === oldLead.status) {
    return res.ok(oldLead, 'Status is already set to ' + status);
  }

  // Handle conversion if status is changed to Converted
  if (status === 'Converted' && oldLead.status !== 'Converted') {
    const { performLeadConversion } = require('../utils/leadConversion');
    await performLeadConversion(id, req.user.company_id, req.user.id, getAuthUserModelName(req));
    
    const lead = await Lead.findOne({ _id: id, company_id: req.user.company_id })
      .populate('assignedTo', 'name email')
      .populate('convertedCustomerId', 'customer_id name phone status created_at total_purchase_amount');

    await notifyAccountantsOfConversion(req.user.company_id, lead);
    return res.ok(lead, 'Lead converted to Customer profile successfully');
  }

  const updated = await Lead.findOneAndUpdate(
    { _id: id, company_id: req.user.company_id },
    { status, lastActivityAt: new Date() },
    { new: true, runValidators: true }
  ).populate('assignedTo', 'name email');

  const { logActivity } = require('../utils/activityLogger');
  await logActivity({
    company_id: req.user.company_id,
    user_id: req.user.id,
    user_model: getAuthUserModelName(req),
    description: `Status updated from ${oldLead.status} to ${status}`,
    related_to: id,
    related_type: 'Lead'
  });

  res.ok(updated);
});

exports.deleteLead = asyncHandler(async (req, res, next) => {

  if (req.user?.role !== 'Admin') {
    return res.fail('Only Administrators can delete lead records', 403);
  }

  const { id } = req.params;

  try {
    // 1. Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: `Invalid lead ID format: ${id}` });
    }

    // 2. Locate lead with company context
    const lead = await Lead.findOne({ _id: id, company_id: req.user.company_id });
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found or already moved to trash' });
    }

    const leadName = lead.name;
    const companyId = req.user.company_id;
    const userId = req.user.id;

    // 3. Perform atomic move to trash
    await moveDocumentToTrash({
      entityType: 'lead',
      document: lead,
      deletedBy: userId
    });

    // 4. Log activity
    const { logActivity } = require('../utils/activityLogger');
    await logActivity({
      company_id: companyId,
      user_id: userId,
      user_model: getAuthUserModelName(req),
      description: `Lead moved to trash: ${leadName}`,
      related_to: id,
      related_type: 'Lead'
    });

    return res.ok(null, 'Lead successfully moved to trash');
  } catch (err) {
    console.error('[FATAL] Delete Lead Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Critical error during lead deletion',
      error: err.message,
      code: err.code || 'UNKNOWN_ERROR',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});



exports.listLeadNotes = asyncHandler(async (req, res, next) => {

  const { page = 1, limit = 20 } = req.query;
  const leadId = req.params.id;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));

  const [items, total] = await Promise.all([
    LeadNote.find({ lead_id: leadId, company_id: req.user.company_id })
      .sort({ created_at: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    LeadNote.countDocuments({ lead_id: leadId, company_id: req.user.company_id }),
  ]);

  res.ok({ items, total, page: pageNum, limit: limitNum });
});

exports.addLeadNote = asyncHandler(async (req, res, next) => {

  const leadId = req.params.id;
  const lead = await Lead.findById(leadId);
  if (!lead) {
    return res.fail('Lead not found', 404);
  }

  const payload = req.body || {};
  const noteText = String(payload.note ?? '').trim();
  if (!noteText) {
    return res.fail('Note is required', 400);
  }
  const created = await LeadNote.create({
    lead_id: leadId,
    company_id: req.user.company_id,
    user_id: req.user.id,
    user_id_model: getAuthUserModelName(req),
    note: noteText,
  });
  res.created(created);
});

exports.deleteLeadNote = asyncHandler(async (req, res, next) => {

  const { id, noteId } = req.params;
  const note = await LeadNote.findOne({ _id: noteId, lead_id: id });
  if (!note) {
    return res.fail('Lead note not found', 404);
  }
  await moveDocumentToTrash({ entityType: 'lead_note', document: note, deletedBy: req.user?.id });
  res.ok(null, 'Lead note moved to trash');
});

exports.bulkUpdateLeads = asyncHandler(async (req, res, next) => {

  const { ids, update } = req.body || {};
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.fail('No lead IDs provided', 400);
  }

  const { logActivity } = require('../utils/activityLogger');
  const results = [];

  for (const id of ids) {
    const oldLead = await Lead.findOne({ _id: id, company_id: req.user.company_id });
    if (!oldLead) continue;

    const updated = await Lead.findOneAndUpdate(
      { _id: id, company_id: req.user.company_id },
      update,
      { new: true }
    );

    if (updated) {
      let desc = 'Bulk update performed';
      if (update.status) desc = `Status updated to ${update.status} (Bulk)`;
      if (update.assignedTo || update.assigned_to) desc = `Lead reassigned (Bulk)`;

      await logActivity({
        company_id: req.user.company_id,
        user_id: req.user.id,
        user_model: getAuthUserModelName(req),
        description: desc,
        related_to: id,
        related_type: 'Lead'
      });
      results.push(id);
    }
  }

  res.ok({ updatedCount: results.length, ids: results });
});

exports.bulkDeleteLeads = asyncHandler(async (req, res, next) => {

  const { ids } = req.body || {};
  if (req.user?.role !== 'Admin') {
    return res.fail('Only Administrators can bulk delete records', 403);
  }
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.fail('No IDs provided', 400);
  }

  const { logActivity } = require('../utils/activityLogger');
  let deletedCount = 0;
  let errorCount = 0;

  for (const id of ids) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        errorCount++;
        continue;
      }

      const lead = await Lead.findOne({ _id: id, company_id: req.user.company_id });
      if (!lead) continue;

      const leadName = lead.name;

      await moveDocumentToTrash({
        entityType: 'lead',
        document: lead,
        deletedBy: req.user.id
      });

      await logActivity({
        company_id: req.user.company_id,
        user_id: req.user.id,
        user_model: getAuthUserModelName(req),
        description: `Lead moved to trash (Bulk): ${leadName}`,
        related_to: id,
        related_type: 'Lead'
      });

      deletedCount++;
    } catch (err) {
      console.error(`[FATAL] Bulk Delete Error for ID ${id}:`, err);
      errorCount++;
    }
  }

  res.ok({ deletedCount, errorCount }, `${deletedCount} records moved to Trash successfully. ${errorCount ? `${errorCount} failed.` : ''}`);
});

exports.updateFollowup = asyncHandler(async (req, res, next) => {

  const { id } = req.params;
  const { mode, status, nextFollowupDate, note, requestId } = req.body;

  if (!nextFollowupDate && status === 'planned') {
    return res.fail('Next follow-up date is required for planned follow-ups', 400);
  }

  // 1. Start MongoDB session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 2. Fetch Lead with Idempotency & Concurrency Lock
    const lead = await Lead.findOne({ _id: id, company_id: req.user.company_id }).session(session);
    if (!lead) {
      await session.abortTransaction();
      return res.fail('Lead not found', 404);
    }

    // Idempotency Check
    if (requestId && lead.lastRequestId === requestId) {
      await session.commitTransaction();
      return res.ok(lead, 'Request already processed (Idempotency)');
    }

    // Concurrency Lock Check (Simple flag-based lock for this demo)
    if (lead.followupLock) {
      await session.abortTransaction();
      return res.fail('Another follow-up update is in progress for this lead', 409);
    }

    // Set Lock
    lead.followupLock = true;
    lead.lastRequestId = requestId;
    await lead.save({ session });

    // 3. Validation: No past dates for planned follow-ups
    const now = new Date();
    const targetDate = new Date(nextFollowupDate);
    if (status === 'planned' && targetDate < now) {
      lead.followupLock = false;
      await lead.save({ session });
      await session.abortTransaction();
      return res.fail('Cannot schedule a planned follow-up in the past', 400);
    }

    // 4. Cleanup: Mark existing "planned" follow-ups as "skipped"
    if (lead.followupHistory && lead.followupHistory.length > 0) {
      lead.followupHistory.forEach(h => {
        if (h.status === 'planned') {
          h.status = 'skipped';
          h.isDone = true;
          h.note = `[Auto-Skipped] ${h.note || ''}`;
        }
      });
    }

    // 5. Create new follow-up entry
    const newFollowup = {
      date: now,
      note: note || '',
      nextFollowupDate: targetDate,
      status: status || 'planned',
      followupType: mode || 'Call',
      isDone: status !== 'planned'
    };
    lead.followupHistory.push(newFollowup);

    // 6. Lead Level Sync
    lead.nextFollowupDate = status === 'planned' ? targetDate : null;
    lead.followupNote = note || '';
    if (status === 'completed') {
      lead.lastContactDate = now;
      lead.status = 'Contacted'; // Advance status if completed
    }

    // Release Lock
    lead.followupLock = false;
    await lead.save({ session });

    // 7. Sync Activity Log
    const Activity = require('../models/Activity');
    await Activity.create([{
      company_id: req.user.company_id,
      activity_type: 'follow-up',
      follow_up_mode: mode || 'Call',
      description: `[Unified Follow-up] Status: ${status}. Note: ${note || 'No notes'}`,
      related_to: lead._id,
      related_type: 'Lead',
      activity_date: now,
      due_date: targetDate,
      status: status === 'planned' ? 'planned' : 'completed',
      assigned_to: lead.assignedTo,
      created_by: req.user.id
    }], { session });

    // 8. Commit Transaction
    await session.commitTransaction();
    res.ok(lead, 'Follow-up saved successfully');

  } catch (error) {
    await session.abortTransaction();
    console.error('Follow-up Transaction Error:', error);
    res.fail(error.message || 'Error processing follow-up transaction', 500);
  } finally {
    session.endSession();
  }
});
