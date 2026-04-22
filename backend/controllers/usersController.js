const mongoose = require('mongoose');
const User = require('../models/User');
const DemoUser = require('../models/DemoUser');
const { asyncHandler } = require('../middleware/asyncHandler');
const { moveDocumentToTrash } = require('../utils/trash');

const ALLOWED_ROLES = ['Admin', 'Manager', 'Accountant', 'Employee'];
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
const ROLE_ALIASES = {
  admin: 'Admin',
  manager: 'Manager',
  accountant: 'Accountant',
  employee: 'Employee',
};

function extractId(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    const maybe = value.id ?? value._id ?? value.value;
    if (maybe === null || maybe === undefined) return undefined;
    return String(maybe).trim();
  }
  return String(value).trim();
}

function sanitizePhone(value) {
  if (value === null || value === undefined) return value;
  const raw = String(value).trim();
  if (!raw) return undefined;
  const trimmed = raw.replace(/\s+/g, '');
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/[^\d]/g, '');
  if (!digits) return undefined;
  return hasPlus ? `+${digits}` : digits;
}

function normalizeRole(value) {
  const safeStr = String(value ?? '').trim();
  const lower = safeStr.toLowerCase();
  return ROLE_ALIASES[lower] || safeStr;
}

function buildSearchQuery(q) {
  if (!q) return null;
  const safe = String(q).trim();
  if (!safe) return null;
  return { $regex: safe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
}

function cleanPayload(body = {}, options = {}) {
  const { inferUsernameFromName = true } = options;
  const payload = { ...body };

  if (inferUsernameFromName && !payload.username && payload.name) {
    payload.username = payload.name;
  }

  if (payload.company_id !== undefined) payload.company_id = extractId(payload.company_id);
  if (payload.manager_id !== undefined) payload.manager_id = extractId(payload.manager_id);

  if (payload.email) payload.email = String(payload.email).trim().toLowerCase();
  if (payload.name) payload.name = String(payload.name).trim();
  if (payload.username) payload.username = String(payload.username).trim();
  if (payload.phone !== undefined) payload.phone = sanitizePhone(payload.phone);
  if (payload.role) payload.role = normalizeRole(payload.role);
  if (payload.status) payload.status = String(payload.status).trim();
  if (payload.tags && !Array.isArray(payload.tags)) {
    payload.tags = [payload.tags];
  }
  if (Array.isArray(payload.tags)) {
    payload.tags = payload.tags.map((t) => String(t).trim()).filter(Boolean);
  }

  Object.keys(payload).forEach(key => {
    if (payload[key] === '') {
      payload[key] = undefined;
    }
  });

  return payload;
}

async function ensureUniqueEmail(email, excludeId = null) {
  if (!email) return;
  
  const query = { email };
  if (excludeId) {
    const oid = typeof excludeId === 'string' ? new mongoose.Types.ObjectId(excludeId) : excludeId;
    query._id = { $ne: oid };
  }

  const [existingUser, existingDemoUser] = await Promise.all([
    User.findOne(query),
    DemoUser.findOne(query)
  ]);

  return existingUser || existingDemoUser;
}

exports.listUsers = asyncHandler(async (req, res) => {
  const { q, status, role, page = 1, limit = 20, sortField = 'created_at', sortOrder = 'desc', all } = req.query;

  const pageNum = Math.max(1, Number(page) || 1);
  const wantsAll = String(limit).trim().toLowerCase() === 'all';
  const limitNum = wantsAll ? null : Math.min(100, Math.max(1, Number(limit) || 20));
  const sort = { [sortField]: sortOrder === 'desc' ? -1 : 1 };
  const search = buildSearchQuery(q);

  const filter = {};
  filter.company_id = req.user.company_id;
  if (status) filter.status = String(status).trim();
  if (req.query.manager_id) filter.manager_id = String(req.query.manager_id).trim();
  if (role) filter.role = normalizeRole(role) || String(role).trim();
  if (search) {
    filter.$or = [{ name: search }, { username: search }, { email: search }, { phone: search }];
  }

  const query = User.find(filter).populate('company_id', 'company_name status').sort(sort);
  if (!wantsAll) {
    query.skip((pageNum - 1) * limitNum).limit(limitNum);
  }

  const [items, total] = await Promise.all([query, User.countDocuments(filter)]);

  res.ok({ items, page: pageNum, limit: wantsAll ? 'all' : limitNum, total });
});

exports.createUser = asyncHandler(async (req, res) => {
  const payload = cleanPayload(req.body || {}, { inferUsernameFromName: true });
  // Never trust client-provided company payload.
  delete payload.company_id;

  // If it's an onboarding user, we only need username and password
  if (req.body.is_onboarding) {
    if (!payload.username || !payload.password) {
      return res.fail('Username and password are required for onboarding staff', 400);
    }
    payload.is_profile_complete = false;
  } else {
    // Normal user creation requires email
    if (!payload.email) {
      return res.fail('Email is required', 400);
    }
    const existing = await ensureUniqueEmail(payload.email);
    if (existing) {
      return res.fail('Email already in use', 400);
    }
    payload.is_profile_complete = true;
  }

  payload.company_id = req.user.company_id;
  const created = await User.create(payload);
  res.created(created);
});

exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({ 
    _id: req.params.id, 
    ...(req.user.role === 'Admin' ? {} : { company_id: req.user.company_id })
  }).populate('company_id', 'company_name status');
  if (!user) {
    return res.fail('User not found', 404);
  }
  res.ok(user);
});

exports.updateUser = asyncHandler(async (req, res) => {
  const payload = cleanPayload(req.body || {}, { inferUsernameFromName: false });
  delete payload.company_id;
  delete payload.company;
  delete payload.companyId;

  const allowedUpdateFields = new Set([
    'name',
    'email',
    'phone',
    'employee_id',
    'department',
    'joining_date',
    'manager_id',
    'role',
    'profile_photo',
    'status',
    'tags',
    'date_of_birth',
    'is_profile_complete',
    'settings',
  ]);

  const updates = {};
  Object.keys(payload).forEach((key) => {
    if (!allowedUpdateFields.has(key)) return;
    updates[key] = payload[key];
  });

  const existing = await ensureUniqueEmail(payload.email, req.params.id);
  if (existing) {
    return res.fail('Email already in use', 400);
  }

  const user = await User.findOne({ 
    _id: req.params.id, 
    ...(req.user.role === 'Admin' ? {} : { company_id: req.user.company_id })
  }).select('+password');
  if (!user) {
    return res.fail('User not found', 404);
  }

  Object.keys(updates).forEach((key) => {
    const value = updates[key];
    if (value === undefined || value === null) {
      return;
    }
    
    if (value === '') {
      if (key === 'password') return;
      user[key] = undefined;
      return;
    }
    user[key] = value;
  });

  await user.save();
  let reloaded;
  try {
    reloaded = await User.findById(req.params.id).populate('company_id', 'company_name status');
  } catch (err) {
    reloaded = await User.findById(req.params.id);
  }
  res.ok(reloaded, 'User updated successfully');
});

exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({ 
    _id: req.params.id, 
    ...(req.user.role === 'Admin' ? {} : { company_id: req.user.company_id })
  }).select('+password');
  if (!user) {
    return res.fail('User not found', 404);
  }
  await moveDocumentToTrash({ entityType: 'user', document: user, deletedBy: req.user?.id });
  res.ok(null, 'User moved to trash');
});

exports.resetUserPassword = asyncHandler(async (req, res) => {
  const newPassword = String(req.body?.newPassword ?? '');

  if (!newPassword) {
    return res.fail('New password is required', 400);
  }

  if (!PASSWORD_REGEX.test(newPassword)) {
    return res.fail('Password must be at least 6 characters and include letters and numbers', 400);
  }

  const user = await User.findOne({ 
    _id: req.params.id, 
    ...(req.user.role === 'Admin' ? {} : { company_id: req.user.company_id })
  }).select('+password');
  if (!user) {
    return res.fail('User not found', 404);
  }

  user.password = newPassword;
  await user.save();

  res.ok(null, 'User password reset successfully');
});
