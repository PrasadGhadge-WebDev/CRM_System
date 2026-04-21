const User = require('../models/User');
const Company = require('../models/Company');
const Role = require('../models/Role');
const Status = require('../models/Status');
const LeadSource = require('../models/LeadSource');
const logger = require('./logger');

function getDefaultAdminConfig() {
  return {
    username: String(process.env.DEFAULT_ADMIN_USERNAME || 'admin').trim(),
    name: String(process.env.DEFAULT_ADMIN_NAME || 'System Admin').trim(),
    email: String(process.env.DEFAULT_ADMIN_EMAIL || 'admin@crm.com').trim().toLowerCase(),
    phone: String(process.env.DEFAULT_ADMIN_PHONE || '9876543210').trim(),
    password: String(process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123').trim(),
    role: 'Admin',
    status: 'active',
  };
}

function getDefaultAdminEmail() {
  return getDefaultAdminConfig().email;
}

async function ensureDefaultAdmin() {
  // 1. Ensure Default Company exists
  let defaultCompany = await Company.findOne({ company_name: 'System Workspace' });
  if (!defaultCompany) {
    logger.info('Creating default system workspace...');
    defaultCompany = await Company.create({
      company_name: 'System Workspace',
      email: 'system@crm.com',
      phone: '9876543210',
      status: 'active'
    });
  }

  // 2. Ensure Default Roles exist for this company
  const rolesToSeed = [
    { name: 'Admin', description: 'Full system access', permissions: ['leads', 'customers', 'deals', 'tickets', 'users', 'reports', 'tasks', 'followups', 'billing', 'trash', 'settings', 'notifications'], is_system_role: true },
    { name: 'Manager', description: 'Management access', permissions: ['leads', 'customers', 'deals', 'reports', 'tasks', 'followups'], is_system_role: true },
    { name: 'Accountant', description: 'Financial access', permissions: ['customers', 'deals', 'billing', 'reports'], is_system_role: true },
    { name: 'Employee', description: 'Standard staff access', permissions: ['leads', 'tasks', 'followups'], is_system_role: true },
  ];

  for (const r of rolesToSeed) {
    const exists = await Role.findOne({ company_id: defaultCompany._id, name: r.name });
    if (!exists) {
      await Role.create({ ...r, company_id: defaultCompany._id });
      logger.info(`Seeded default role "${r.name}" for System Workspace`);
    }
  }

  // 3. Ensure Default Statuses exist
  const statusesToSeed = [
    // Lead Statuses
    { name: 'New', type: 'lead', color: '#EAB308', order: 0, is_default: true },
    { name: 'Contacted', type: 'lead', color: '#3B82F6', order: 1 },
    { name: 'Qualified', type: 'lead', color: '#A855F7', order: 2 },
    { name: 'Negotiation', type: 'lead', color: '#F97316', order: 3 },
    { name: 'Won', type: 'lead', color: '#22C55E', order: 4 },
    { name: 'Lost', type: 'lead', color: '#EF4444', order: 5 },
    // Deal Statuses
    { name: 'Proposal Sent', type: 'deal', color: '#EAB308', order: 0, is_default: true },
    { name: 'Under Review', type: 'deal', color: '#3B82F6', order: 1 },
    { name: 'Approved', type: 'deal', color: '#A855F7', order: 2 },
    { name: 'Completed', type: 'deal', color: '#22C55E', order: 3 },
    { name: 'Cancelled', type: 'deal', color: '#EF4444', order: 4 },
  ];

  for (const s of statusesToSeed) {
    const exists = await Status.findOne({ company_id: defaultCompany._id, type: s.type, name: s.name });
    if (!exists) {
      await Status.create({ ...s, company_id: defaultCompany._id });
      logger.info(`Seeded default status "${s.name}" (${s.type})`);
    }
  }

  // 4. Ensure Default Lead Sources exist
  const sourcesToSeed = [
    { name: 'Google Ads', category: 'Paid', is_default: true },
    { name: 'Facebook Ads', category: 'Paid' },
    { name: 'LinkedIn Ads', category: 'Paid' },
    { name: 'Website Form', category: 'Organic' },
    { name: 'SEO', category: 'Organic' },
    { name: 'Referral', category: 'Referral' },
    { name: 'Cold Call', category: 'Direct' },
  ];

  for (const src of sourcesToSeed) {
    const exists = await LeadSource.findOne({ company_id: defaultCompany._id, name: src.name });
    if (!exists) {
      await LeadSource.create({ ...src, company_id: defaultCompany._id });
      logger.info(`Seeded default lead source "${src.name}"`);
    }
  }

  // 5. Ensure Default Admin exists and is linked to company
  const adminConfig = getDefaultAdminConfig();
  let admin = await User.findOne({ email: adminConfig.email });

  if (admin) {
    if (!admin.company_id) {
      admin.company_id = defaultCompany._id;
      await admin.save();
      logger.info(`Linked existing admin "${admin.email}" to System Workspace`);
    }
    return admin;
  }

  admin = await User.create({
     ...adminConfig,
     company_id: defaultCompany._id
  });

  logger.warn(
    `Default admin created automatically and linked to "System Workspace". Email: "${admin.email}".`
  );

  return admin;
}

module.exports = {
  ensureDefaultAdmin,
  getDefaultAdminEmail,
};
