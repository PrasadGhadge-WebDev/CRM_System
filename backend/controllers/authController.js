const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const DemoUser = require('../models/DemoUser');
const Company = require('../models/Company');
const Role = require('../models/Role');
const { asyncHandler } = require('../middleware/asyncHandler');
const { ensureDefaultAdmin, getDefaultAdminEmail } = require('../utils/defaultAdmin');
const { seedDemoData } = require('../utils/demoDataSeeder');
const notifier = require('../utils/notifier');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
const ALLOWED_ROLES = ['Admin', 'Manager', 'Accountant', 'Employee'];
const REGISTERABLE_ROLES = ['Admin', 'Manager', 'Accountant', 'Employee'];
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_BLOCK_DURATION_MS = 15 * 60 * 1000;
const ROLE_ALIASES = {
  admin: 'Admin',
  manager: 'Manager',
  accountant: 'Accountant',
  employee: 'Employee',
};

async function seedDefaultRoles(companyId) {
  if (!companyId) return;
  const defaultRoles = [
    {
      name: 'Admin',
      description: 'Full system access',
      permissions: ['leads', 'customers', 'deals', 'tickets', 'users', 'reports', 'tasks', 'followups', 'billing', 'trash', 'settings', 'notifications'],
      is_system_role: true,
    },
    {
      name: 'Manager',
      description: 'Management access',
      permissions: ['leads', 'customers', 'deals', 'reports', 'tasks', 'followups'],
      is_system_role: true,
    },
    {
      name: 'Accountant',
      description: 'Financial access',
      permissions: ['customers', 'deals', 'billing', 'reports'],
      is_system_role: true,
    },
    {
      name: 'Employee',
      description: 'Standard staff access',
      permissions: ['leads', 'tasks', 'followups'],
      is_system_role: true,
    },
  ].map((role) => ({ ...role, company_id: companyId }));

  try {
    await Role.insertMany(defaultRoles, { ordered: false });
  } catch (err) {
    if (err?.code !== 11000) {
      throw err;
    }
  }
}

function getDemoAccountConfig() {
  return {
    username: String(process.env.DEMO_USER_USERNAME || 'demo').trim(),
    name: String(process.env.DEMO_USER_NAME || 'Demo User').trim(),
    email: String(process.env.DEMO_USER_EMAIL || 'demo@crm.com').trim().toLowerCase(),
    phone: String(process.env.DEMO_USER_PHONE || '9876543211').trim(),
    password: String(process.env.DEMO_USER_PASSWORD || 'Demo123').trim(),
    role: String(process.env.DEMO_USER_ROLE || 'Manager').trim(),
    status: 'active',
  };
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeRole(value) {
  const normalized = normalizeText(value).toLowerCase();
  return ROLE_ALIASES[normalized] || '';
}

function normalizeUsername(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 30);
}

async function resolveUniqueUsername(...candidates) {
  const baseUsername =
    candidates.map(normalizeUsername).find(Boolean) || `user${Date.now()}`;

  let username = baseUsername;
  let suffix = 1;

  while ((await User.exists({ username })) || (await DemoUser.exists({ username }))) {
    suffix += 1;
    username = `${baseUsername}${suffix}`;
  }

  return username;
}

function getRequestIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || '';
}

function getBlockMessage(blockedUntil) {
  const remainingMs = new Date(blockedUntil).getTime() - Date.now();
  const remainingMinutes = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));
  return `Too many wrong attempts. Try again in ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}.`;
}

async function registerFailedLoginAttempt(user) {
  user.failed_login_attempts = Number(user.failed_login_attempts || 0) + 1;

  if (user.failed_login_attempts >= MAX_LOGIN_ATTEMPTS) {
    user.failed_login_attempts = 0;
    user.login_blocked_until = new Date(Date.now() + LOGIN_BLOCK_DURATION_MS);
    await user.save();
    return {
      blocked: true,
      message: getBlockMessage(user.login_blocked_until),
    };
  }

  await user.save();
  return {
    blocked: false,
    message: 'Invalid credentials',
  };
}

function validateRegisterPayload(body) {
  const errors = [];
  const email = normalizeEmail(body.email);
  const name = normalizeText(body.name || body.fullName || body.username || email.split('@')[0]);
  const username = normalizeText(body.username);
  const phone = normalizeText(body.phone);
  const password = String(body.password ?? '');
  const role = normalizeRole(body.role) || 'Admin';

  if (!name) {
    errors.push('Full name is required');
  } else if (name.length < 3) {
    errors.push('Full name must be at least 3 characters');
  }

  if (!email) {
    errors.push('Email is required');
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push('Enter a valid email address');
  }

  if (!phone) {
    errors.push('Phone is required');
  } else if (!PHONE_REGEX.test(phone)) {
    errors.push('Enter a valid 10-digit mobile number');
  }

  if (!password) {
    errors.push('Password is required');
  } else if (!PASSWORD_REGEX.test(password)) {
    errors.push('Password must be at least 6 characters and include letters and numbers');
  }

  return {
    errors,
    values: { username, name, email, phone, password, role },
  };
}

function validateLoginPayload(body) {
  const errors = [];
  const identifier = normalizeText(body.email || body.username || body.identifier);
  const password = String(body.password ?? '');

  if (!identifier) {
    errors.push('Email or Username is required');
  } else if (identifier.includes('@') && !EMAIL_REGEX.test(identifier.toLowerCase())) {
    errors.push('Enter a valid email address');
  } else if (!identifier.includes('@') && identifier.length < 3) {
    errors.push('Username must be at least 3 characters');
  }

  if (!password) {
    errors.push('Password is required');
  } else if (password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }

  return {
    errors,
    values: { identifier, password },
  };
}

function serializeUser(user, permissions = []) {
  return {
    id: String(user._id),
    username: user.username || user.name,
    name: user.name || user.username,
    email: user.email,
    role: user.role || 'Admin',
    permissions: permissions, // Added dynamic permissions
    company_id: user.company_id || '',
    phone: user.phone || '',
    profile_photo: user.profile_photo || '',
    status: user.status || 'active',
    last_login: user.last_login || null,
    settings: {
      emailNotifications: user.settings?.emailNotifications ?? true,
      weeklyDigest: user.settings?.weeklyDigest ?? false,
    },
    is_trial: user.is_trial ?? false,
    is_demo: user.is_demo ?? false,
    trial_ends_at: user.trial_ends_at || null,
  };
}

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const { errors, values } = validateRegisterPayload(req.body);

  if (errors.length > 0) {
    console.error('[Registration] Validation failed:', errors);
    return res.fail(errors[0], 400, { errors });
  }

  console.log('[Registration] Incoming payload:', JSON.stringify(req.body, null, 2));
  console.log('[Registration] Processed values:', JSON.stringify(values, null, 2));

  try {
    const [existingUser, existingDemoUser] = await Promise.all([
      User.findOne({ email: values.email }),
      DemoUser.findOne({ email: values.email })
    ]);

    if (existingUser || existingDemoUser) {
      return res.fail('Email already registered', 400);
    }

    const username = await resolveUniqueUsername(
      values.username,
      values.email.split('@')[0],
      values.name.replace(/\s+/g, ''),
    );

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 5);

    // 1. Create a new Company for the registrant
    console.log('[Registration] Creating company...');
    const company = await Company.create({
      company_name: `${values.name}'s Workspace`,
      email: values.email,
      phone: values.phone,
      status: 'active',
    });

    // 2. Create the Demo User linked to this company
    console.log('[Registration] Creating demo user linked to company:', company._id);
    
    // Generate secure approval token
    const approvalToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    const user = await DemoUser.create({
      username,
      name: values.name,
      email: values.email,
      phone: values.phone,
      role: values.role,
      company_id: company._id,
      status: 'active',
      password: values.password,
      is_trial: true,
      is_demo: true,
      trial_ends_at: trialEndsAt,
      approval_token: approvalToken,
      approval_token_expires: tokenExpires,
    });

    // 3. Create Default System Roles for the company
    console.log('[Registration] Seeding default roles...');
    await seedDefaultRoles(company._id);

    // 4. Seed the workspace with Demo Entries
    console.log('[Registration] Seeding demo data for company:', company._id);
    await seedDemoData(company._id, user._id, 'DemoUser');

    // 5. Notify System Admin with Instant Alert
    try {
      console.log('[Registration] Sending instant admin alert...');
      await notifier.sendInstantRegistrationAlert(user, company.company_name);

      const title = 'New Instant Demo Registration';
      const message = `A new demo user ${user.name} (${user.email}) has registered and received auto-approval.`;
      await notifier.notifyAdmin({ title, message });
    } catch (notifErr) {
      console.error('[Registration] Failed to send admin notifications:', notifErr);
    }

    // 6. Return success with token (Log them in immediately)
    console.log('[Registration] Auto-approved and logging in:', user.email);
    return sendTokenResponse(user, 201, res);
  } catch (error) {
    console.error('[Registration] Critical error:', error);
    
    // Specific check for MongoDB duplicate key error (code 11000)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      const message = `Duplicate entry for ${field}. Please use a different value.`;
      return res.fail(message, 400, { duplicateField: field });
    }

    if (error.name === 'ValidationError') {
      console.error('[Registration] Mongoose Validation Error Details:', JSON.stringify(error.errors, null, 2));
      const firstError = Object.values(error.errors)[0]?.message || error.message;
      return res.fail(firstError, 400, { validationErrors: error.errors });
    }
    // Clean up if something failed?
    return res.fail(error.message || 'Server error during registration', 500, { 
      error: error.message,
      stack: error.stack 
    });
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { errors, values } = validateLoginPayload(req.body);

  if (errors.length > 0) {
    return res.fail(errors[0], 400, { errors });
  }

  let user = await User.findOne({
    $or: [
      { email: values.identifier.toLowerCase() },
      { username: values.identifier }
    ]
  }).select('+password');

  if (!user) {
    user = await DemoUser.findOne({
      $or: [
        { email: values.identifier.toLowerCase() },
        { username: values.identifier }
      ]
    }).select('+password');
  }

  if (!user && values.identifier === getDefaultAdminEmail()) {
    await ensureDefaultAdmin();
    user = await User.findOne({ email: values.identifier }).select('+password');
  }

  if (!user || !user.password) {
    return res.fail('Invalid credentials', 401);
  }

  if (user.login_blocked_until && user.login_blocked_until.getTime() > Date.now()) {
    return res.fail(getBlockMessage(user.login_blocked_until), 429);
  }

  let isMatch = false;
  try {
    isMatch = await user.matchPassword(values.password);
  } catch (err) {
    const failedAttempt = await registerFailedLoginAttempt(user);
    return res.fail(failedAttempt.message, failedAttempt.blocked ? 429 : 401);
  }

  if (!isMatch) {
    const failedAttempt = await registerFailedLoginAttempt(user);
    return res.fail(failedAttempt.message, failedAttempt.blocked ? 429 : 401);
  }

  if (user.status === 'pending') {
    return res.fail('Your account is pending admin approval.', 403);
  }

  if (user.status === 'inactive') {
    return res.fail('Your account is inactive. Please contact an administrator.', 403);
  }

  const loginAt = new Date();
  user.last_login = loginAt;
  user.failed_login_attempts = 0;
  user.login_blocked_until = undefined;
  await user.save();

  const roleData = await Role.findOne({ company_id: user.company_id, name: user.role });
  const permissions = roleData ? roleData.permissions : [];

  sendTokenResponse(user, 200, res, permissions);
});


// @desc    Login to demo workspace with a unique Guest account
// @route   POST /api/auth/demo-login
// @access  Public
exports.demoLogin = asyncHandler(async (req, res, next) => {
  // 1. Create a unique Company for the guest
  const guestId = Math.random().toString(36).substring(2, 7).toUpperCase();
  const company = await Company.create({
    company_name: `Demo Workspace (${guestId})`,
    email: `guest_${guestId}@decrm.io`,
    status: 'active',
  });

  // 2. Create the Guest User linked to this company
  const guestEmail = `guest_${guestId}_${Date.now()}@decrm.io`;
  const guestName = `Guest User (${guestId})`;
  const guestPassword = `Guest!${guestId}${Date.now()}`;
  const guestUsername = `guest_${guestId}_${Date.now()}`;

  const roleInput = String(req.body.role || req.query.role || 'Manager').trim().toLowerCase();
  const demoRole = ROLE_ALIASES[roleInput] || 'Manager';
  if (!ALLOWED_ROLES.includes(demoRole)) {
    return res.fail('Invalid demo role', 400);
  }

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 5);

  const user = await DemoUser.create({
    username: guestUsername,
    name: guestName,
    email: guestEmail,
    password: guestPassword,
    role: demoRole,
    company_id: company._id,
    status: 'active',
    is_profile_complete: true,
    is_trial: true,
    is_demo: true,
    trial_ends_at: trialEndsAt,
  });

  try {
    await seedDefaultRoles(company._id);
    // 3. Seed the unique sandbox with Demo Entries
    await seedDemoData(company._id, user._id, 'DemoUser');

    const loginAt = new Date();
    user.last_login = loginAt;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('[DemoLogin] Critical error during seeding:', error);
    return res.fail(error.message || 'Demo creation failed at data seeding. Please try again.', 500);
  }
});

// @desc    Switch role for demo user (same account, different permissions)
// @route   POST /api/auth/demo-switch
// @access  Private
exports.demoSwitchRole = asyncHandler(async (req, res) => {
  if (!req.user || (!req.user.is_demo && !req.user.is_trial)) {
    return res.fail('Role switching is available for demo and trial users only', 403);
  }

  const requestedRole = String(req.body.role || '').trim().toLowerCase();
  const normalizedRole = ROLE_ALIASES[requestedRole];
  if (!normalizedRole || !ALLOWED_ROLES.includes(normalizedRole)) {
    return res.fail('Invalid role selection', 400);
  }

  req.user.role = normalizedRole;
  await req.user.save();

  const roleData = await Role.findOne({ company_id: req.user.company_id, name: normalizedRole });
  const permissions = roleData ? roleData.permissions : [];

  sendTokenResponse(req.user, 200, res, permissions);
});

const sendTokenResponse = (user, statusCode, res, permissions = []) => {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret123', {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });

  const options = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options);

  return res.ok({
    token,
    user: serializeUser(user, permissions),
  }, statusCode === 201 ? 'Registration successful' : 'Login successful', statusCode);
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const roleData = await Role.findOne({ company_id: req.user.company_id, name: req.user.role });
  const permissions = roleData ? roleData.permissions : [];
  res.ok({ user: serializeUser(req.user, permissions) });
});

// @desc    Update current logged in user
// @route   PUT /api/auth/me
// @access  Private
exports.updateMe = asyncHandler(async (req, res, next) => {
  const { username, name, email, profile_photo } = req.body;

  const nextName = name?.trim() || username?.trim();
  if (!nextName || !email?.trim()) {
    return res.fail('Name and email are required', 400);
  }

  const [emailInUse, demoEmailInUse] = await Promise.all([
    User.findOne({
      email: email.trim().toLowerCase(),
      _id: { $ne: req.user._id },
    }),
    DemoUser.findOne({
      email: email.trim().toLowerCase(),
      _id: { $ne: req.user._id },
    })
  ]);

  if (emailInUse || demoEmailInUse) {
    return res.fail('Email already in use', 400);
  }

  req.user.name = nextName;
  req.user.username = username?.trim() || nextName;
  req.user.email = email.trim().toLowerCase();
  req.user.profile_photo = typeof profile_photo === 'string' ? profile_photo.trim() : req.user.profile_photo;
  await req.user.save();

  res.ok({ user: serializeUser(req.user) }, 'Profile updated successfully');
});

// @desc    Update current user password
// @route   PUT /api/auth/password
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.fail('Current and new password are required', 400);
  }

  if (String(newPassword).length < 6) {
    return res.fail('New password must be at least 6 characters', 400);
  }

  const model = req.user.is_demo ? DemoUser : User;
  const user = await model.findById(req.user._id).select('+password');
  const isMatch = await user.matchPassword(currentPassword);

  if (!isMatch) {
    return res.fail('Current password is incorrect', 400);
  }

  user.password = newPassword;
  await user.save();

  res.ok(null, 'Password updated successfully');
});

// @desc    Update current user settings
// @route   PUT /api/auth/settings
// @access  Private
exports.updateSettings = asyncHandler(async (req, res, next) => {
  if (req.user?.is_demo) {
    return res.fail('Demo users cannot change settings', 403);
  }

  const nextSettings = {
    emailNotifications: Boolean(req.body.emailNotifications),
    weeklyDigest: Boolean(req.body.weeklyDigest),
  };

  req.user.settings = {
    emailNotifications: nextSettings.emailNotifications,
    weeklyDigest: nextSettings.weeklyDigest,
  };

  await req.user.save();

  res.ok({ user: serializeUser(req.user) }, 'Settings updated successfully');
});

// @desc    Verify user for onboarding
// @route   POST /api/auth/onboarding/verify
// @access  Public
exports.verifyOnboarding = asyncHandler(async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.fail('Username and password are required', 400);
  }

  const user = await User.findOne({ username }).select('+password');

  if (!user) {
    return res.fail('Invalid credentials', 401);
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return res.fail('Invalid credentials', 401);
  }

  if (user.is_profile_complete) {
    return res.fail('Profile already completed. Please login normally.', 400);
  }

  res.ok({
    userId: user._id,
    username: user.username,
  }, 'Credentials verified. Please complete your profile.');
});

// @desc    Complete profile for onboarding
// @route   POST /api/auth/onboarding/complete
// @access  Public
exports.completeOnboarding = asyncHandler(async (req, res, next) => {
  const { userId, name, email, phone } = req.body;

  if (!userId || !name || !email || !phone) {
    return res.fail('All fields (Name, Email, Phone) are required', 400);
  }

  if (!EMAIL_REGEX.test(email)) {
    return res.fail('Enter a valid email address', 400);
  }

  if (!PHONE_REGEX.test(phone)) {
    return res.fail('Enter a valid 10-digit mobile number', 400);
  }

  const user = await User.findById(userId).select('+password');
  if (!user) {
    return res.fail('User not found', 404);
  }

  if (user.is_profile_complete) {
    return res.fail('Profile already completed', 400);
  }

  const existingEmail = await User.findOne({ email, _id: { $ne: userId } });
  if (existingEmail) {
    return res.fail('Email already in use', 400);
  }

  user.name = name;
  user.email = email;
  user.phone = phone;
  user.is_profile_complete = true;
  user.status = 'active';

  user.markModified('name');
  user.markModified('email');
  user.markModified('phone');
  user.markModified('is_profile_complete');
  user.markModified('status');

  await user.save();

  res.ok(serializeUser(user), 'Profile completed successfully. You can now login.');
});

// @desc    Log user out / clear cookie
// @route   GET /api/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.ok({}, 'Logged out successfully');
});
