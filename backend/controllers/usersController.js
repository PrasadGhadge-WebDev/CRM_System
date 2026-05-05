const mongoose = require('mongoose');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/asyncHandler');
const { moveDocumentToTrash } = require('../utils/trash');
const crypto = require('crypto');
const notifier = require('../utils/notifier');

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

function isHRUser(req) {
  return req.user?.role === 'HR';
}

function ensureHRCanOnlyManageEmployees(req, targetRole) {
  if (!isHRUser(req)) return null;
  if (normalizeRole(targetRole) !== 'Employee') {
    return 'HR can only access employee users';
  }
  return null;
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

  return User.findOne(query);
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
  if (isHRUser(req)) {
    filter.role = 'Employee';
  } else if (role) {
    filter.role = normalizeRole(role) || String(role).trim();
  }
  if (search) {
    filter.$or = [
      { name: search },
      { username: search },
      { email: search },
      { phone: search },
      { role: search },
      { status: search },
      { employee_id: search },
      { tags: search },
      { address: search }
    ];
  }

  const query = User.find(filter).populate('company_id', 'company_name status').sort(sort);
  if (!wantsAll) {
    query.skip((pageNum - 1) * limitNum).limit(limitNum);
  }

  const summaryPipeline = [
    { $match: filter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ];

  const [items, totalFiltered, statusStats] = await Promise.all([query, User.countDocuments(filter), User.aggregate(summaryPipeline)]);

  const summary = {
    total: totalFiltered,
    byStatus: {}
  };
  statusStats.forEach(s => {
    if (s._id) summary.byStatus[s._id] = s.count;
  });

  res.ok({ items, page: pageNum, limit: wantsAll ? 'all' : limitNum, total: totalFiltered, summary });
});



exports.createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, status, department, designation, phone, username: providedUsername } = req.body;

  // 1. Basic Validation
  if (!name || !email || !password) {
    return res.fail('Name, Email and Password are required', 400);
  }

  // 2. Check for existing email
  const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
  if (existingUser) {
    return res.fail('Email already in use', 400);
  }

  // 3. Resolve Unique Username
  // Use provide username or infer from name/email
  const baseUsername = providedUsername || name.replace(/\s+/g, '').toLowerCase() || email.split('@')[0];
  let username = baseUsername.toLowerCase().replace(/[^a-z0-9._-]+/g, '');
  
  let suffix = 1;
  while (await User.exists({ username })) {
    username = `${baseUsername.toLowerCase().replace(/[^a-z0-9._-]+/g, '')}${suffix}`;
    suffix++;
  }

  // 4. HR Permission check (if applicable)
  const hrRoleError = ensureHRCanOnlyManageEmployees(req, role || 'Employee');
  if (hrRoleError) {
    return res.fail(hrRoleError, 403);
  }

  // 4. Create User (Password hashing handled by model pre-save)
  const user = new User({
    name,
    username,
    email: email.toLowerCase().trim(),
    password,
    role: role || 'Employee',
    status: status || 'active',
    department,
    designation,
    phone,
    company_id: req.user.company_id,
    is_profile_complete: true
  });

  // 5. Generate Reset Token and Email if Active
  if (user.status === 'active') {
    const resetToken = user.getResetPasswordToken();
    await user.save();

    // Send Welcome Email with Reset Link (Background)
    notifier.sendWelcomeEmailWithResetLink(
      user.email,
      user.name,
      resetToken,
      user.role,
      process.env.FRONTEND_URL || 'http://localhost:3000'
    ).catch(err => console.error('Failed to send welcome email:', err));
  } else {
    await user.save();
  }

  res.created(user);
});


exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({ 
    _id: req.params.id, 
    ...(req.user.role === 'Admin' ? {} : { company_id: req.user.company_id })
  }).populate('company_id', 'company_name status');
  if (!user) {
    return res.fail('User not found', 404);
  }
  if (isHRUser(req) && user.role !== 'Employee') {
    return res.fail('HR can only access employee users', 403);
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
    'designation',
    'joining_date',
    'manager_id',
    'role',
    'profile_photo',
    'status',
    'tags',
    'date_of_birth',
    'is_profile_complete',
    'settings',
    'password',
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

  if (isHRUser(req) && user.role !== 'Employee') {
    return res.fail('HR can only access employee users', 403);
  }

  const hrRoleError = ensureHRCanOnlyManageEmployees(req, updates.role || user.role);
  if (hrRoleError) {
    return res.fail(hrRoleError, 403);
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
    if (key === 'password') return;
    user[key] = value;
  });

  let generatedPassword = null;
  if (req.body.send_email) {
    generatedPassword = crypto.randomBytes(6).toString('hex');
    user.password = generatedPassword;
    user.force_password_change = true;
  } else if (updates.password) {
    user.password = updates.password;
    user.force_password_change = false; // Admin manually set it
  }

  await user.save();
  
  if (generatedPassword) {
    // Background execution (Non-blocking)
    sendUserCreationEmail(
      user.email, 
      user.name, 
      generatedPassword, 
      user.role, 
      process.env.FRONTEND_URL
    ).catch(err => console.error('Account update email failed:', err));
  }
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
  if (isHRUser(req) && user.role !== 'Employee') {
    return res.fail('HR can only access employee users', 403);
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
  if (isHRUser(req) && user.role !== 'Employee') {
    return res.fail('HR can only access employee users', 403);
  }

  user.password = newPassword;
  await user.save();

  res.ok(null, 'User password reset successfully');
});
