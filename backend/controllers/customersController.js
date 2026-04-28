const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const CustomerNote = require('../models/CustomerNote');
const { asyncHandler } = require('../middleware/asyncHandler');
const { parseCsv, rowsToObjects, toCsv } = require('../utils/csv');
const { moveDocumentToTrash } = require('../utils/trash');

function buildSearchQuery(q) {
  if (!q) return null;
  const safe = String(q).trim();
  if (!safe) return null;
  return { $regex: safe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
}

exports.listCustomers = asyncHandler(async (req, res) => {
  const {
    customer_type,
    status,
    assigned_to: assignedToFilter,
    startDate,
    endDate,
    q,
    companyId,
    page = 1,
    limit = 20,
    sortField = 'created_at',
    sortOrder = 'desc',
    is_vip,
  } = req.query;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const sort = { [sortField]: sortOrder === 'desc' ? -1 : 1 };

  const search = buildSearchQuery(q);
  const filter = { isDeleted: { $ne: true } };

  if (req.user?.company_id) {
    filter.company_id = req.user.company_id;
  } else if (companyId) {
    filter.company_id = companyId;
  }

  // --- Role-Based Access Control ---
  if (req.user?.role === 'Employee') {
    filter.assigned_to = req.user.id;
  } else if (req.user?.role === 'Manager') {
    // Manager: Team Access (Self + Reporting Users)
    const User = require('../models/User');
    const teamMembers = await User.find({ manager_id: req.user.id }).select('_id');
    const teamIds = teamMembers.map(m => m._id);
    filter.assigned_to = { $in: [req.user.id, ...teamIds] };
  }
  // Admin, Accountant, HR see all in company by default
  
  if (assignedToFilter) {
    // If specific assignee filter is provided, it must be within the allowed set
    if (filter.assigned_to) {
       // Combine filters if already restricted
       if (filter.assigned_to.$in) {
         if (filter.assigned_to.$in.includes(assignedToFilter)) {
            filter.assigned_to = assignedToFilter;
         } else {
            // Filter out if not in team
            filter.assigned_to = { $in: [] }; 
         }
       } else if (String(filter.assigned_to) !== String(assignedToFilter)) {
         filter.assigned_to = { $in: [] };
       }
    } else {
      filter.assigned_to = assignedToFilter;
    }
  }

  if (customer_type) filter.customer_type = customer_type;
  if (status) filter.status = status;
  if (is_vip === 'true' || is_vip === true) filter.is_vip = true;

  if (startDate || endDate) {
    filter.created_at = {};
    if (startDate) filter.created_at.$gte = new Date(startDate);
    if (endDate) {
      const ed = new Date(endDate);
      ed.setHours(23, 59, 59, 999);
      filter.created_at.$lte = ed;
    }
  }

  if (search) {
    filter.$or = [
      { name: search },
      { email: search },
      { phone: search },
      { city: search },
      { customer_id: search }
    ];
  }

  const [customers, total] = await Promise.all([
    Customer.find(filter)
      .populate('assigned_to', 'name email role')
      .sort(sort)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    Customer.countDocuments(filter),
  ]);

  // Inject dynamic metrics
  const Deal = require('../models/Deal');
  const items = await Promise.all(customers.map(async (c) => {
    const [dealCount, lastNote] = await Promise.all([
      Deal.countDocuments({ customer_id: c._id, isDeleted: { $ne: true } }),
      CustomerNote.findOne({ customer_id: c._id }).sort({ created_at: -1 }).select('created_at')
    ]);
    return {
      ...c,
      id: c._id,
      total_deals: dealCount,
      last_interaction: lastNote?.created_at || c.created_at
    };
  }));

  res.ok({ items, page: pageNum, limit: limitNum, total });
});

exports.createCustomer = asyncHandler(async (req, res) => {
  // Roles allowed to create: Admin, Manager
  if (!['Admin', 'Manager'].includes(req.user?.role)) {
    return res.fail('Only Administrators and Managers can onboard new clients', 403);
  }

  const payload = req.body || {};
  if (req.user?.company_id) {
    payload.company_id = req.user.company_id;
  }

  const duplicateConditions = [];
  if (payload.email) duplicateConditions.push({ email: String(payload.email).trim().toLowerCase() });
  if (payload.phone) duplicateConditions.push({ phone: String(payload.phone).trim() });

  if (duplicateConditions.length > 0) {
    const existing = await Customer.findOne({
      company_id: payload.company_id || { $exists: true },
      $or: duplicateConditions,
      isDeleted: { $ne: true }
    });

    if (existing) {
      if (payload.email && existing.email === String(payload.email).trim().toLowerCase()) {
        return res.fail(`A customer with email ${payload.email} already exists`, 400);
      }
      if (payload.phone && existing.phone === String(payload.phone).trim()) {
        return res.fail(`A customer with phone ${payload.phone} already exists`, 400);
      }
    }
  }

  const created = await Customer.create(payload);
  res.created(created);
});

exports.getCustomer = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id, isDeleted: { $ne: true } };
  if (req.user?.company_id) {
    filter.company_id = req.user.company_id;
  }

  const customer = await Customer.findOne(filter)
    .populate('assigned_to', 'name email role')
    .populate('converted_from_lead_id', 'name status email phone');

  if (!customer) {
    return res.fail('Customer not found', 404);
  }

  // Role Access Check
  if (req.user?.role === 'Employee') {
    if (String(customer.assigned_to?._id || customer.assigned_to) !== String(req.user.id)) {
      return res.fail('Access denied: Record not assigned to you', 403);
    }
  } else if (req.user?.role === 'Manager') {
    // Check if assigned to team
    const assignedId = String(customer.assigned_to?._id || customer.assigned_to);
    if (assignedId !== String(req.user.id)) {
      const User = require('../models/User');
      const isTeamMember = await User.exists({ _id: assignedId, manager_id: req.user.id });
      if (!isTeamMember) {
        return res.fail('Access denied: Record not in your team scope', 403);
      }
    }
  }

  res.ok(customer);
});

exports.updateCustomer = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id, isDeleted: { $ne: true } };
  if (req.user?.company_id) {
    filter.company_id = req.user.company_id;
  }

  const customer = await Customer.findOne(filter);
  if (!customer) return res.fail('Customer not found', 404);

  // Role Access Check
  if (req.user?.role === 'Employee') {
    if (String(customer.assigned_to) !== String(req.user.id)) {
      return res.fail('Access denied: You can only update your own assigned customers', 403);
    }
    // Employee can only update specific fields
    const allowed = ['name', 'email', 'phone', 'alternate_phone', 'address', 'city', 'postal_code', 'notes', 'status'];
    const payload = req.body || {};
    for (const key of Object.keys(payload)) {
      if (!allowed.includes(key)) delete payload[key];
    }
  } else if (req.user?.role === 'Manager') {
    const assignedId = String(customer.assigned_to);
    if (assignedId !== String(req.user.id)) {
      const User = require('../models/User');
      const isTeamMember = await User.exists({ _id: assignedId, manager_id: req.user.id });
      if (!isTeamMember) {
        return res.fail('Access denied: You can only update team-assigned customers', 403);
      }
    }
  } else if (['Accountant', 'HR'].includes(req.user?.role)) {
    return res.fail('Access denied: View-only permissions', 403);
  }

  const payload = req.body || {};
  const duplicateConditions = [];
  if (payload.email) duplicateConditions.push({ email: String(payload.email).trim().toLowerCase() });
  if (payload.phone) duplicateConditions.push({ phone: String(payload.phone).trim() });

  if (duplicateConditions.length > 0) {
    const existing = await Customer.findOne({
      _id: { $ne: req.params.id },
      company_id: customer.company_id,
      $or: duplicateConditions,
      isDeleted: { $ne: true }
    });

    if (existing) {
      if (payload.email && existing.email === String(payload.email).trim().toLowerCase()) {
        return res.fail(`A customer with email ${payload.email} already exists`, 400);
      }
      if (payload.phone && existing.phone === String(payload.phone).trim()) {
        return res.fail(`A customer with phone ${payload.phone} already exists`, 400);
      }
    }
  }

  const updated = await Customer.findOneAndUpdate(
    filter,
    payload,
    {
      new: true,
      runValidators: true,
    }
  );

  res.ok(updated);
});

exports.deleteCustomer = asyncHandler(async (req, res) => {
  // Only Admin can delete (move to trash)
  if (req.user?.role !== 'Admin') {
    return res.fail('Only Administrators can delete client records', 403);
  }

  const filter = { _id: req.params.id };
  if (req.user?.company_id) {
    filter.company_id = req.user.company_id;
  }

  const customer = await Customer.findOne(filter);
  if (!customer) {
    return res.fail('Customer not found', 404);
  }

  await customer.softDelete(req.user.id);

  const TrashEntry = require('../models/TrashEntry');
  await TrashEntry.create({
    entity_type: 'customer',
    entity_id: customer._id,
    company_id: req.user.company_id,
    title: customer.name,
    deleted_by: req.user.id,
    deleted_at: new Date()
  });

  res.ok(null, 'Record moved to Trash successfully');
});

const CSV_HEADERS = [
  'name',
  'email',
  'phone',
  'alternate_phone',
  'address',
  'city',
  'postal_code',
  'customer_type',
  'status',
  'notes',
];

exports.exportCustomersCsv = asyncHandler(async (req, res) => {
  if (['Accountant', 'HR', 'Employee'].includes(req.user?.role)) {
    return res.fail('Access denied: Export restricted', 403);
  }

  const { q, companyId } = req.query;
  const filter = { isDeleted: { $ne: true } };
  
  if (req.user?.company_id) {
    filter.company_id = req.user.company_id;
  } else if (companyId) {
    filter.company_id = companyId;
  }

  if (req.user?.role === 'Manager') {
    const User = require('../models/User');
    const teamMembers = await User.find({ manager_id: req.user.id }).select('_id');
    const teamIds = teamMembers.map(m => m._id);
    filter.assigned_to = { $in: [req.user.id, ...teamIds] };
  }

  const search = buildSearchQuery(q);
  if (search) filter.$or = [{ name: search }, { email: search }, { phone: search }];

  const template = String(req.query.template || '').toLowerCase();
  const wantsTemplate = template === '1' || template === 'true' || template === 'yes';

  const items = wantsTemplate
    ? []
    : await Customer.find(filter).sort({ created_at: -1 }).limit(5000);

  const { toCsv } = require('../utils/csv');
  const rows = [CSV_HEADERS];
  for (const c of items) {
    rows.push(CSV_HEADERS.map((h) => (c[h] === undefined ? '' : c[h])));
  }

  const filename = wantsTemplate ? 'customers-template.csv' : 'customers-export.csv';
  const csv = '\ufeff' + toCsv(rows);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

exports.importCustomersCsv = asyncHandler(async (req, res) => {
  if (!['Admin', 'Manager'].includes(req.user?.role)) {
    return res.fail('Access denied: Import restricted', 403);
  }

  const { csv } = req.body || {};
  if (!csv) return res.fail('Missing csv data', 400);

  const { parseCsv, rowsToObjects } = require('../utils/csv');
  const rows = parseCsv(csv);
  const objects = rowsToObjects(rows, { header: true });

  const created = [];
  const errors = [];
  let skipped = 0;

  for (let idx = 0; idx < objects.length; idx++) {
    const r = objects[idx] || {};
    const payload = {};
    for (const key of CSV_HEADERS) {
      if (r[key] !== undefined) payload[key] = String(r[key]).trim();
    }

    if (!payload.name) {
      skipped++;
      continue;
    }

    payload.company_id = req.user.company_id;
    payload.assigned_to = req.user.id; // Default to importer

    try {
      const doc = await Customer.create(payload);
      created.push(doc);
    } catch (e) {
      errors.push({ row: idx + 2, message: e.message });
    }
  }

  res.created({
    created: created.length,
    skipped,
    errors,
  }, `Imported ${created.length} customers`);
});

exports.getCustomerAnalytics = asyncHandler(async (req, res) => {
  // Accountant/Admin can see analytics
  if (!['Admin', 'Accountant', 'Manager'].includes(req.user?.role)) {
     return res.fail('Access denied', 403);
  }

  const filter = { isDeleted: { $ne: true } };
  if (req.user?.company_id) {
    filter.company_id = req.user.company_id;
  }

  if (req.user?.role === 'Manager') {
    const User = require('../models/User');
    const teamMembers = await User.find({ manager_id: req.user.id }).select('_id');
    const teamIds = teamMembers.map(m => m._id);
    filter.assigned_to = { $in: [req.user.id, ...teamIds] };
  }

  const [total, active, inactive, topCustomers, paymentsSummary] = await Promise.all([
    Customer.countDocuments(filter),
    Customer.countDocuments({ ...filter, status: 'Active' }),
    Customer.countDocuments({ ...filter, status: 'Inactive' }),
    Customer.find(filter)
      .sort({ total_purchase_amount: -1 })
      .limit(5)
      .select('name email total_purchase_amount status'),
    Customer.aggregate([
      { $match: filter },
      { $group: {
        _id: null,
        totalPaid: { $sum: '$total_purchase_amount' },
        avgPaid: { $avg: '$total_purchase_amount' }
      }}
    ])
  ]);

  res.ok({
    total,
    active,
    inactive,
    topCustomers,
    metrics: paymentsSummary[0] || { totalPaid: 0, avgPaid: 0 }
  });
});

exports.convertLead = asyncHandler(async (req, res) => {
  if (!['Admin', 'Manager', 'Employee'].includes(req.user?.role)) {
    return res.fail('Not allowed to convert leads', 403);
  }
  const { lead_id, assigned_to, source, initial_note } = req.body;

  if (!lead_id) return res.fail('Lead ID is required', 400);
  const lead = await Lead.findById(lead_id);
  if (!lead) return res.fail('Lead not found', 404);

  // Step 1: Duplicate Check
  const duplicateConditions = [];
  if (lead.email) duplicateConditions.push({ email: lead.email });
  if (lead.phone) duplicateConditions.push({ phone: lead.phone });

  if (duplicateConditions.length > 0) {
    const existing = await Customer.findOne({
      company_id: lead.company_id || req.user.company_id,
      $or: duplicateConditions,
      isDeleted: { $ne: true }
    });
    if (existing) {
      return res.fail('A customer with this email or phone already exists in your database', 400);
    }
  }

  // Step 2 & 3: Mapping & Assignment
  const customerPayload = {
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company_name: lead.company,
    company_id: lead.company_id || req.user.company_id,
    assigned_to: assigned_to || lead.assignedTo || req.user.id,
    assigned_by: req.user.id,
    source: source || lead.source || 'Lead Conversion',
    converted_from_lead_id: lead._id,
    status: 'Active',
    notes: initial_note || lead.notes,
    last_interaction_date: new Date()
  };

  const customer = await Customer.create(customerPayload);
  
  // Step 1: Link & Update Lead
  lead.convertedCustomerId = customer._id;
  lead.status = 'Converted';
  lead.convertedAt = new Date();
  await lead.save();

  // Step 7: Activity Tracking
  const { logActivity } = require('../utils/activityLogger');
  await logActivity({
    activity_type: 'Customer Created',
    category: 'system',
    description: `Converted from Lead ${lead.leadId || lead.name}. ${initial_note ? `Note: ${initial_note}` : ''}`,
    related_to: customer._id,
    related_type: 'Customer',
    company_id: req.user.company_id,
    created_by: req.user.id,
    color_code: 'green'
  });

  if (initial_note) {
    await CustomerNote.create({
      customer_id: customer._id,
      author_id: req.user.id,
      content: initial_note
    });
  }

  res.created(customer);
});

exports.addNote = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const customer_id = req.params.id;
  if (!content) return res.fail('Note content is required', 400);

  const note = await CustomerNote.create({
    customer_id,
    author_id: req.user.id,
    content
  });

  res.created(note);
});

exports.listNotes = asyncHandler(async (req, res) => {
  const notes = await CustomerNote.find({ customer_id: req.params.id })
    .populate('author_id', 'name role')
    .sort({ created_at: -1 });

  res.ok(notes);
});


