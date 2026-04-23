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
  } = req.query;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const sort = { [sortField]: sortOrder === 'desc' ? -1 : 1 };

  const search = buildSearchQuery(q);
  const filter = {};
  if (req.user?.company_id) {
    filter.company_id = req.user.company_id;
  } else if (companyId) {
    filter.company_id = companyId;
  }

  if (req.user?.role === 'Employee') {
    filter.assigned_to = req.user.id;
  } else if (assignedToFilter) {
    filter.assigned_to = assignedToFilter;
  }

  if (customer_type) filter.customer_type = customer_type;
  if (status) filter.status = status;

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
      .populate('assigned_to', 'name email')
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
      Deal.countDocuments({ customer_id: c._id }),
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
  if (req.user?.role === 'Employee') {
    return res.fail('Not allowed', 403);
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
      $or: duplicateConditions
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
  const filter = { _id: req.params.id };
  if (req.user?.company_id) {
    filter.company_id = req.user.company_id;
  }
  if (req.user?.role === 'Employee') {
    filter.assigned_to = req.user.id;
  }
  const customer = await Customer.findOne(filter)
    .populate('assigned_to', 'name email')
    .populate('converted_from_lead_id', 'name status email phone');
  if (!customer) {
    return res.fail('Customer not found', 404);
  }
  res.ok(customer);
});

exports.updateCustomer = asyncHandler(async (req, res) => {
  if (req.user?.role === 'Employee') {
    return res.fail('Not allowed', 403);
  }

  const filter = { _id: req.params.id };
  if (req.user?.company_id) {
    filter.company_id = req.user.company_id;
  }

  const payload = req.body || {};
  const duplicateConditions = [];
  if (payload.email) duplicateConditions.push({ email: String(payload.email).trim().toLowerCase() });
  if (payload.phone) duplicateConditions.push({ phone: String(payload.phone).trim() });

  if (duplicateConditions.length > 0) {
    const existing = await Customer.findOne({
      _id: { $ne: req.params.id },
      company_id: filter.company_id || { $exists: true },
      $or: duplicateConditions
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
  if (!updated) {
    return res.fail('Customer not found', 404);
  }
  res.ok(updated);
});

exports.deleteCustomer = asyncHandler(async (req, res) => {
  if (req.user?.role === 'Employee') {
    return res.fail('Not allowed', 403);
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
  'company_id',
  'name',
  'email',
  'phone',
  'alternate_phone',
  'address',
  'city',
  'state',
  'country',
  'postal_code',
  'customer_type',
  'notes',
  'follow_up_date',
];

exports.exportCustomersCsv = asyncHandler(async (req, res) => {
  if (req.user?.role === 'Employee') {
    return res.fail('Not allowed', 403);
  }
  const { q, companyId } = req.query;
  const limitParam = Number(req.query.limit);
  const maxLimit = 10000;
  const limitNum = Math.min(maxLimit, Math.max(1, Number.isFinite(limitParam) ? limitParam : maxLimit));

  const search = buildSearchQuery(q);
  const filter = {};
  if (req.user?.company_id) {
    filter.company_id = req.user.company_id;
  } else if (companyId) {
    filter.company_id = companyId;
  }
  if (req.user?.role === 'Employee') {
    filter.assigned_to = req.user.id;
  }
  if (search) filter.$or = [{ name: search }, { email: search }, { phone: search }];

  const template = String(req.query.template || '').toLowerCase();
  const wantsTemplate = template === '1' || template === 'true' || template === 'yes';

  const items = wantsTemplate
    ? []
    : await Customer.find(filter)
        .sort({ created_at: -1 })
        .limit(limitNum);

  const rows = [CSV_HEADERS];
  for (const c of items) {
    rows.push(CSV_HEADERS.map((h) => (c[h] === undefined ? '' : c[h])));
  }

  const filename = wantsTemplate ? 'customers-template.csv' : 'customers.csv';
  const csv = '\ufeff' + toCsv(rows);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

function cleanImportValue(v) {
  const s = String(v === undefined || v === null ? '' : v).trim();
  return s === '' ? undefined : s;
}

exports.importCustomersCsv = asyncHandler(async (req, res) => {
  if (req.user?.role === 'Employee') {
    return res.fail('Not allowed', 403);
  }
  const { csv } = req.body || {};
  if (!csv || typeof csv !== 'string') {
    res.status(400);
    throw new Error('Missing csv string in request body');
  }

  const rows = parseCsv(csv);
  if (!rows.length) {
    res.status(400);
    throw new Error('CSV is empty');
  }

  const objects = rowsToObjects(rows, { header: true });
  if (!objects.length) {
    res.status(400);
    throw new Error('CSV has no data rows');
  }

  const created = [];
  const errors = [];
  let skipped = 0;

  for (let idx = 0; idx < objects.length; idx++) {
    const rowNum = idx + 2; // header is row 1
    const r = objects[idx] || {};

    const payload = {};
    for (const key of CSV_HEADERS) {
      if (key in r) payload[key] = cleanImportValue(r[key]);
    }

    if (req.user?.company_id) {
      payload.company_id = req.user.company_id;
    }

    if (!payload.name) {
      skipped++;
      continue;
    }

    try {
      const doc = await Customer.create(payload);
      created.push(doc);
    } catch (e) {
      errors.push({ row: rowNum, message: e.message || String(e) });
    }
  }

  res.created({
    created: created.length,
    skipped,
    errors,
  }, `Imported ${created.length} customers`);
});

exports.getCustomerAnalytics = asyncHandler(async (req, res) => {
  const { company_id } = req.query;
  const filter = {};
  if (req.user?.company_id) {
    filter.company_id = req.user.company_id;
  } else if (company_id) {
    filter.company_id = company_id;
  }

  const [total, active, inactive, topCustomers] = await Promise.all([
    Customer.countDocuments(filter),
    Customer.countDocuments({ ...filter, status: 'Active' }),
    Customer.countDocuments({ ...filter, status: 'Inactive' }),
    Customer.find(filter)
      .sort({ total_purchase_amount: -1 })
      .limit(5)
      .select('name email total_purchase_amount status')
  ]);

  res.ok({
    total,
    active,
    inactive,
    topCustomers
  });
});

exports.convertLead = asyncHandler(async (req, res) => {
  const { lead_id, assigned_to, source, initial_note } = req.body;

  if (!lead_id) return res.fail('Lead ID is required for conversion', 400);
  if (!assigned_to) return res.fail('Assigned employee is required', 400);
  if (!source) return res.fail('Lead source is required', 400);

  const lead = await Lead.findById(lead_id);
  if (!lead) return res.fail('Lead not found', 404);
  if (lead.convertedCustomerId) return res.fail('This lead is already converted', 400);

  // Business Logic: Conversion
  const customerPayload = {
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company_name: lead.company,
    company_id: lead.company_id || req.user?.company_id,
    assigned_to: assigned_to,
    source: source,
    converted_from_lead_id: lead._id,
    status: 'Active',
    notes: initial_note || lead.notes
  };

  const customer = await Customer.create(customerPayload);

  // Update lead status
  lead.convertedCustomerId = customer._id;
  lead.convertedAt = new Date();
  lead.status = 'Converted';
  await lead.save();

  // Create initial discussion note if provided
  if (initial_note) {
    await CustomerNote.create({
      customer_id: customer._id,
      author_id: req.user.id,
      content: initial_note
    });
  }

  res.created(customer, 'Lead converted to customer successfully');
});

exports.addNote = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const customer_id = req.params.id;

  if (!content) return res.fail('Note content cannot be empty', 400);

  const note = await CustomerNote.create({
    customer_id,
    author_id: req.user.id,
    content
  });

  res.created(note, 'Discussion note added');
});

exports.listNotes = asyncHandler(async (req, res) => {
  const notes = await CustomerNote.find({ customer_id: req.params.id })
    .populate('author_id', 'name role')
    .sort({ created_at: -1 });

  res.ok(notes);
});

