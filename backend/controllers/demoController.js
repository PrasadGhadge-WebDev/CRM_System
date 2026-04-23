const crypto = require('crypto');
const DemoUser = require('../models/DemoUser');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/asyncHandler');
const { sendEmail } = require('../utils/emailService');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;
const ADMIN_EMAIL = 'prasadghadge748@gmail.com';

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function normalizePhone(value) {
  return normalizeText(value).replace(/\D/g, '');
}

function normalizeUsername(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 30);
}

async function resolveUniqueUsername(...candidates) {
  const baseUsername = candidates.map(normalizeUsername).find(Boolean) || `demo${Date.now()}`;
  let username = baseUsername;
  let suffix = 1;

  while ((await User.exists({ username })) || (await DemoUser.exists({ username }))) {
    suffix += 1;
    username = `${baseUsername}${suffix}`;
  }

  return username;
}

function buildDashboardUrl() {
  const frontendBase = String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  return `${frontendBase}/demo-users`;
}

async function sendAdminDemoRegistrationEmail(demoUser) {
  const registeredAt = new Date(demoUser.created_at || Date.now());
  const dashboardUrl = buildDashboardUrl();
  const subject = 'New Demo User Registration - CRM System';
  const companyName = demoUser.company_name || 'N/A';

  const text = [
    'New demo user registered.',
    '',
    `Name: ${demoUser.name || 'N/A'}`,
    `Email: ${demoUser.email || 'N/A'}`,
    `Phone: ${demoUser.phone || 'N/A'}`,
    `Company: ${companyName}`,
    `Registered At: ${registeredAt.toLocaleString()}`,
    `Dashboard: ${dashboardUrl}`,
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin: 0 0 12px;">New Demo User Registration - CRM System</h2>
      <p style="margin: 0 0 12px;">A new demo user has registered.</p>
      <table style="border-collapse: collapse; width: 100%; max-width: 560px;">
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Name</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${demoUser.name || 'N/A'}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Email</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${demoUser.email || 'N/A'}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Phone</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${demoUser.phone || 'N/A'}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Company</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${companyName}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Registered At</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${registeredAt.toLocaleString()}</td></tr>
      </table>
      <p style="margin-top: 14px;">
        <a href="${dashboardUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 10px 14px; border-radius: 6px; text-decoration: none;">
          View All Demo Users
        </a>
      </p>
    </div>
  `;

  await sendEmail({
    to: ADMIN_EMAIL,
    subject,
    text,
    html,
  });
}

// @desc    Register demo user (public landing page form)
// @route   POST /api/demo/register
// @access  Public
exports.registerDemo = asyncHandler(async (req, res) => {
  const name = normalizeText(req.body?.name);
  const email = normalizeEmail(req.body?.email);
  const phone = normalizePhone(req.body?.phone);
  const companyName = normalizeText(req.body?.company_name || req.body?.companyName);

  if (!name) return res.fail('Name is required', 400);
  if (!email || !EMAIL_REGEX.test(email)) return res.fail('Valid email is required', 400);
  if (!phone || !PHONE_REGEX.test(phone)) return res.fail('Valid 10-digit phone is required', 400);

  const [existingUser, existingDemoUser] = await Promise.all([
    User.findOne({ email }).select('_id'),
    DemoUser.findOne({ email }).select('_id'),
  ]);

  if (existingUser || existingDemoUser) {
    return res.fail('Email already registered', 400);
  }

  const username = await resolveUniqueUsername(email.split('@')[0], name.replace(/\s+/g, ''));
  const randomPassword = crypto.randomBytes(12).toString('base64url');

  const demoUser = await DemoUser.create({
    username,
    name,
    email,
    phone,
    company_name: companyName || undefined,
    role: 'Admin',
    status: 'approved',
    password: randomPassword,
    is_demo: true,
    is_trial: true,
  });

  // Email is a required side-effect for landing-page demo registrations.
  // If email fails, roll back the record so the same user can retry.
  try {
    await sendAdminDemoRegistrationEmail(demoUser);
  } catch (error) {
    console.error('Failed to send admin demo registration email:', error.message || error);
    try {
      await DemoUser.deleteOne({ _id: demoUser._id });
    } catch (rollbackErr) {
      console.error('Rollback failed after email failure:', rollbackErr.message || rollbackErr);
    }

    return res.fail(
      'Demo registration failed because the admin email could not be sent. Please try again in a moment.',
      500,
    );
  }

  return res.created(
    {
      id: demoUser.id,
      name: demoUser.name,
      email: demoUser.email,
      phone: demoUser.phone,
      company_name: demoUser.company_name || '',
      status: demoUser.status || 'approved',
      created_at: demoUser.created_at,
    },
    'Demo registration successful',
  );
});

// @desc    Get all demo users (admin dashboard)
// @route   GET /api/demo/users
// @access  Private/Admin
exports.listDemoUsersForAdmin = asyncHandler(async (req, res) => {
  const { q, page = 1, limit = 20, sortField = 'created_at', sortOrder = 'desc' } = req.query;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const sort = { [sortField]: sortOrder === 'desc' ? -1 : 1 };
  const filter = {};

  if (q) {
    const search = { $regex: String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    filter.$or = [{ name: search }, { email: search }, { phone: search }, { company_name: search }];
  }

  const [items, total] = await Promise.all([
    DemoUser.find(filter)
      .sort(sort)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    DemoUser.countDocuments(filter),
  ]);

  return res.ok({ items, page: pageNum, limit: limitNum, total });
});
