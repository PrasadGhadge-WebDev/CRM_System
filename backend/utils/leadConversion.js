const Lead = require('../models/Lead');
const Customer = require('../models/Customer');

/**
 * Convert a Lead to a Customer.
 * - Idempotent: retries won't create duplicates.
 * - Duplicate guard: reuses an existing customer with same email/phone in the company.
 */
async function getNextCustomerId(companyId) {
  const Counter = require('../models/Counter');
  const counter = await Counter.findOneAndUpdate(
    { company_id: companyId, model: 'Customer', field: 'customer_id' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  
  // If it's a new counter, it might have the default 'LD-' prefix from the schema
  // We want 'CUST-' for customers.
  if (!counter.prefix || counter.prefix === 'LD-') {
    counter.prefix = 'CUST-';
    await counter.save();
  }
  
  return `${counter.prefix}${counter.seq}`;
}

/**
 * Convert a Lead to a Customer.
 * - Idempotent: retries won't create duplicates.
 * - Duplicate guard: reuses an existing customer with same email/phone in the company.
 */
async function performLeadConversion(leadId, companyId, userId, customerData = null) {
  let resolvedCustomerData = customerData;

  if (customerData && typeof customerData === 'string') {
    resolvedCustomerData = null;
  } 

  const lead = await Lead.findOne({ _id: leadId, company_id: companyId });
  if (!lead) throw new Error('Lead not found');

  if (lead.convertedCustomerId) {
    return { customerId: lead.convertedCustomerId };
  }

  const normalizedUserModel = 'User';

  const baseCustomer = {
    company_id: companyId,
    customer_id: await getNextCustomerId(companyId),
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company_name: lead.company || lead.company_name,
    source: lead.source || 'Lead Conversion',
    notes: lead.notes,
    assigned_to: userId || lead.assignedTo,
    assigned_to_model: lead.assignedToModel || 'User',
    status: 'Active',
    converted_from_lead_id: lead._id,
    last_interaction_date: new Date()
  };

  const payload = { ...baseCustomer, ...(resolvedCustomerData && typeof resolvedCustomerData === 'object' ? resolvedCustomerData : {}) };
  if (payload.email) payload.email = String(payload.email).trim().toLowerCase();
  if (payload.phone) payload.phone = String(payload.phone).trim();

  const dupConditions = [];
  if (payload.email) dupConditions.push({ email: payload.email });
  if (payload.phone) dupConditions.push({ phone: payload.phone });

  let customer = null;
  if (dupConditions.length > 0) {
    customer = await Customer.findOne({ company_id: companyId, $or: dupConditions, isDeleted: { $ne: true } });
  }

  if (!customer) {
    customer = await Customer.create(payload);
  } else if (!customer.converted_from_lead_id) {
    customer.converted_from_lead_id = lead._id;
    if (!customer.customer_id) customer.customer_id = payload.customer_id;
    await customer.save();
  }

  lead.status = 'Converted';
  lead.convertedCustomerId = customer._id;
  lead.convertedAt = new Date();
  lead.lastActivityAt = new Date();
  await lead.save();

  // Log Activity
  try {
    const { logActivity } = require('./activityLogger');
    await logActivity({
      company_id: companyId,
      user_id: userId,
      user_model: 'User',
      type: 'Lead Converted',
      description: `Lead ${lead.name} converted to Customer ${customer.customer_id}`,
      related_to: customer._id,
      related_type: 'Customer',
      color_code: 'green'
    });
  } catch (err) {
    console.error('Failed to log conversion activity', err);
  }

  return { customerId: customer._id };
}

async function performLeadToDealConversion(leadId, companyId, userId, dealData = {}) {
  // First ensure lead is converted to customer
  const { customerId } = await performLeadConversion(leadId, companyId, userId);
  
  const Deal = require('../models/Deal');
  const { getNextDealId } = require('../controllers/dealsController'); // Ensure ID generation
  
  const payload = {
    ...dealData,
    company_id: companyId,
    customer_id: customerId,
    created_by: userId,
    assigned_to: userId,
    stage: 'Prospecting' // Start at first stage of sales pipeline
  };

  if (!payload.readable_id) {
    payload.readable_id = await getNextDealId(companyId);
  }

  const deal = await Deal.create(payload);

  return { customerId, dealId: deal._id, deal };
}

module.exports = { performLeadConversion, performLeadToDealConversion };
