const Lead = require('../models/Lead');
const Customer = require('../models/Customer');

/**
 * Convert a Lead to a Customer.
 * - Idempotent: retries won't create duplicates.
 * - Duplicate guard: reuses an existing customer with same email/phone in the company.
 */
async function performLeadConversion(leadId, companyId, userId, customerData = null) {
  let userModel = 'User';
  let resolvedCustomerData = customerData;

  if (customerData && typeof customerData === 'string') {
    userModel = customerData;
    resolvedCustomerData = null;
  } else if (customerData && typeof customerData === 'object' && customerData.userModel) {
    userModel = customerData.userModel;
  }

  const lead = await Lead.findOne({ _id: leadId, company_id: companyId });
  if (!lead) throw new Error('Lead not found');

  if (lead.convertedCustomerId) {
    return { customerId: lead.convertedCustomerId };
  }

  const normalizedUserModel = 'User';

  const baseCustomer = {
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    source: lead.source,
    notes: lead.notes,
    assigned_to: userId || lead.assignedTo,
    assigned_to_model: userId ? normalizedUserModel : (lead.assignedToModel || 'User'),
    status: 'Prospect',
    converted_from_lead_id: lead._id,
  };

  const payload = { ...baseCustomer, ...(resolvedCustomerData || {}) };
  payload.company_id = companyId;
  if (payload.email) payload.email = String(payload.email).trim().toLowerCase();
  if (payload.phone) payload.phone = String(payload.phone).trim();

  const dupConditions = [];
  if (payload.email) dupConditions.push({ email: payload.email });
  if (payload.phone) dupConditions.push({ phone: payload.phone });

  let customer = null;
  if (dupConditions.length > 0) {
    customer = await Customer.findOne({ company_id: companyId, $or: dupConditions });
  }

  if (!customer) {
    customer = await Customer.create(payload);
  } else if (!customer.converted_from_lead_id) {
    customer.converted_from_lead_id = lead._id;
    await customer.save();
  }

  lead.status = 'Converted';
  lead.convertedCustomerId = customer._id;
  lead.convertedAt = new Date();
  lead.lastActivityAt = new Date();
  await lead.save();

  return { customerId: customer._id };
}

module.exports = { performLeadConversion };
