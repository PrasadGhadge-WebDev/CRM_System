const User = require('../models/User');
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

function cleanPayload(body = {}) {
  const payload = { ...body };

  if (!payload.username && payload.name) {
    payload.username = payload.name;
  }

  if (payload.email) payload.email = String(payload.email).trim().toLowerCase();
  if (payload.name) payload.name = String(payload.name).trim();
  if (payload.username) payload.username = String(payload.username).trim();
  if (payload.phone) payload.phone = String(payload.phone).trim();
  if (payload.manager_id) payload.manager_id = String(payload.manager_id).trim();
  if (payload.role) payload.role = normalizeRole(payload.role);
  if (payload.status) payload.status = String(payload.status).trim();

  Object.keys(payload).forEach(key => {
    if (payload[key] === '') {
      payload[key] = undefined;
    }
  });

  return payload;
}

async function ensureUniqueEmail(email, excludeId = null) {
  if (!email) return;
  const existing = await User.findOne({
    email,
    ...(excludeId ? { _id: { $ne: excludeId } } : null),
  });

  return existing;
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
  const payload = cleanPayload(req.body || {});

  // If it's an onboarding user, we only need username and password
  if (req.body.is_onboarding) {
    if (!payload.username || !payload.password) {
      return res.fail('Username and password are required for onboarding staff', 400);
    }
    payload.is_profile_complete = false;
    // We can set a dummy email if needed, or leave it empty if model allows
    // But since email is unique, we shouldn't set a dummy one that repeats.
    // Our model now allows empty email.
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
  const payload = cleanPayload(req.body || {});
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

  Object.keys(payload).forEach((key) => {
    const value = payload[key];
    if (value === '') {
      user[key] = undefined;
      return;
    }
    user[key] = value;
  });

  await user.save();
  const reloaded = await User.findById(req.params.id).populate('company_id', 'company_name status');
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
