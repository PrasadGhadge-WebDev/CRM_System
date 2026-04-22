const Lead = require('../models/Lead');
const Deal = require('../models/Deal');
const Customer = require('../models/Customer');
const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/asyncHandler');
const { notifyRoleUsers } = require('../utils/notifier');

function getAuthUserModelName(req) {
  return req?.user?.constructor?.modelName === 'DemoUser' ? 'DemoUser' : 'User';
}

const LEAD_STATUS = {
  NEW: 'New',
  ASSIGNED: 'Assigned',
  INTERESTED: 'Interested',
  NOT_INTERESTED: 'Not Interested',
  FOLLOW_UP_REQUIRED: 'Follow-up Required',
  CONVERTED: 'Converted',
};

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

// Lead to Deal conversion
exports.convertToDeal = asyncHandler(async (req, res) => {
  const { leadId, dealData } = req.body;

  const lead = await Lead.findById(leadId);
  if (!lead) return res.fail('Lead not found', 404);

  // Create Deal
  const deal = await Deal.create({
    ...dealData,
    status: dealData.status || 'Qualified',
    company_id: lead.company_id,
    assigned_to: lead.assigned_to,
  });

  // Update Lead status
  lead.status = LEAD_STATUS.CONVERTED;
  await lead.save();

  await notifyAccountantsOfConversion(lead.company_id, lead);

  res.created({ deal, lead }, 'Lead successfully converted to Deal');
});

// Deal/Lead to Customer conversion
exports.convertToCustomer = asyncHandler(async (req, res) => {
  const { sourceId, sourceType, customerData: incomingCustomerData } = req.body; // sourceType: 'lead' or 'deal'
  const customerData = { ...(incomingCustomerData || {}) };

  if (!sourceId || !sourceType) {
    return res.fail('sourceId and sourceType are required', 400);
  }

  let company_id;
  if (sourceType === 'lead') {
    const lead = await Lead.findById(sourceId);
    if (!lead) return res.fail('Lead not found', 404);

    if (lead.convertedCustomerId) {
      const existingCustomer = await Customer.findById(lead.convertedCustomerId);
      if (existingCustomer) {
        return res.ok(
          { customer: existingCustomer, lead },
          'Lead already converted to Customer',
        );
      }
    }

    company_id = lead.company_id;

    // Auto-populate customer data from lead if not provided
    if (!customerData.name) customerData.name = lead.name;
    if (!customerData.email) customerData.email = lead.email;
    if (!customerData.phone) customerData.phone = lead.phone;
    if (!customerData.source) customerData.source = lead.source;
    if (!customerData.assigned_to) customerData.assigned_to = lead.assignedTo;
    if (!customerData.assigned_to_model) customerData.assigned_to_model = lead.assignedToModel || 'User';
    if (!customerData.notes) customerData.notes = lead.notes;

    // Duplicate guard: look for existing customer with same email or phone
    const dupConditions = [];
    if (customerData.email) dupConditions.push({ email: String(customerData.email).trim().toLowerCase() });
    if (customerData.phone) dupConditions.push({ phone: String(customerData.phone).trim() });

    if (dupConditions.length > 0) {
      const existing = await Customer.findOne({
        company_id,
        $or: dupConditions,

      });
      if (existing) {
        // Reuse existing customer — just link the lead
        lead.status = LEAD_STATUS.CONVERTED;
        lead.convertedCustomerId = existing._id;
        lead.convertedAt = new Date();
        lead.lastActivityAt = new Date();
        await lead.save();
        await notifyAccountantsOfConversion(lead.company_id, lead);
        return res.ok(
          { customer: existing, lead },
          `Customer already exists (matched by ${dupConditions.map(d => Object.keys(d)[0]).join(' or ')}). Lead linked to existing customer.`,
        );
      }
    }

    const customer = await Customer.create({
      ...customerData,
      company_id,
      status: customerData.status || 'Active',
      converted_from_lead_id: lead._id,
    });

    lead.status = LEAD_STATUS.CONVERTED;
    lead.convertedCustomerId = customer._id;
    lead.convertedAt = new Date();
    lead.lastActivityAt = new Date();
    await lead.save();

    await notifyAccountantsOfConversion(lead.company_id, lead);

    return res.created({ customer, lead }, 'Lead successfully converted to Customer');
  } else if (sourceType === 'deal') {
    const deal = await Deal.findById(sourceId);
    if (!deal) return res.fail('Deal not found', 404);
    company_id = deal.company_id;
    deal.status = 'won';
    await deal.save();
    
    if (!customerData.name) customerData.name = deal.name;
    if (!customerData.assigned_to) customerData.assigned_to = deal.assigned_to;
    if (!customerData.assigned_to_model) customerData.assigned_to_model = deal.assigned_to_model || 'User';
  } else {
    return res.fail('Unsupported sourceType', 400);
  }

  // Create Customer (deal path) — with duplicate guard
  const dupConditions = [];
  if (customerData.email) dupConditions.push({ email: String(customerData.email).trim().toLowerCase() });
  if (customerData.phone) dupConditions.push({ phone: String(customerData.phone).trim() });

  if (dupConditions.length > 0) {
    const existing = await Customer.findOne({
      company_id,
      $or: dupConditions,

    });
    if (existing) {
      return res.ok(existing, 'Customer already exists — linked to existing record');
    }
  }

  const customer = await Customer.create({
    ...customerData,
    company_id,
    status: customerData.status || 'Active',
  });

  res.created(customer, 'Successfully converted to Customer');
});


// Create Support Ticket
exports.createSupportTicket = asyncHandler(async (req, res) => {
  const { customerId, subject, description, priority, category } = req.body;

  const ticket = await SupportTicket.create({
    customer_id: customerId,
    subject,
    description,
    priority: priority || 'medium',
    status: 'open',
    category,
  });

  res.created(ticket, 'Support ticket created successfully');
});

const { performLeadConversion } = require('../utils/leadConversion');

exports.assignLead = asyncHandler(async (req, res) => {
  const { leadId, userId } = req.body;
  const currentUserId = String(req.user.id);
  const currentUserRole = req.user.role;

  if (!userId) {
    return res.fail('Target user is required for assignment', 400);
  }

  const targetUser = await User.findOne({ _id: userId, company_id: req.user.company_id, status: 'active' });
  if (!targetUser) {
    return res.fail('Target user not found or inactive', 404);
  }

  if (targetUser.role !== 'Employee') {
    return res.fail('Leads can only be assigned to Employee users', 403);
  }

  // 1. Employee rule: can only assign to self
  if (currentUserRole === 'Employee' && userId !== currentUserId) {
    return res.fail('Employees can only assign leads to themselves', 403);
  }

  // 2. Manager rule: can assign only to their own team members
  if (currentUserRole === 'Manager') {
    if (String(targetUser.manager_id) !== currentUserId) {
      return res.fail('Managers can only assign leads to their own team members', 403);
    }
  }

  // 3. Admin rule: can assign across company but only to Employees

  const lead = await Lead.findOneAndUpdate(
    { _id: leadId, company_id: req.user.company_id },
    { assignedTo: userId, assignedToModel: 'User', status: LEAD_STATUS.ASSIGNED, lastActivityAt: new Date() },
    { new: true },
  ).populate('assignedTo', 'name email');

  if (!lead) return res.fail('Lead not found', 404);

  const { logActivity } = require('../utils/activityLogger');
  await logActivity({
    company_id: req.user.company_id,
    user_id: req.user.id,
    user_model: getAuthUserModelName(req),
    description: `Lead assigned to ${lead.assignedTo?.name || 'teammate'}`,
    related_to: leadId,
    related_type: 'Lead'
  });

  res.ok(lead, 'Lead assigned successfully');
});

exports.updateLeadStatus = asyncHandler(async (req, res) => {
  const { leadId, status } = req.body;
  const companyId = req.user.company_id;
  const userId = req.user.id;

  if (status === 'Converted') {
    await performLeadConversion(leadId, companyId, userId, getAuthUserModelName(req));
    const updatedLead = await Lead.findOne({ _id: leadId, company_id: companyId })
        .populate('assignedTo', 'name email')
        .populate('convertedCustomerId', 'customer_id name phone status created_at total_purchase_amount');
    await notifyAccountantsOfConversion(companyId, updatedLead);
    return res.ok(updatedLead, 'Lead converted to Customer profile successfully');
  }

  const oldLeadStatus = (await Lead.findOne({ _id: leadId, company_id: companyId }))?.status;
  const lead = await Lead.findOneAndUpdate(
    { _id: leadId, company_id: companyId },
    { status, lastActivityAt: new Date() },
    { new: true },
  ).populate('assignedTo', 'name email');

  if (!lead) return res.fail('Lead not found', 404);

  if (status !== oldLeadStatus) {
    const { logActivity } = require('../utils/activityLogger');
    await logActivity({
      company_id: req.user.company_id,
      user_id: req.user.id,
      user_model: getAuthUserModelName(req),
      description: `Status updated to ${status}`,
      related_to: leadId,
      related_type: 'Lead'
    });
  }

  res.ok(lead, 'Lead status updated');
});
