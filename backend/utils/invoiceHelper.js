const Invoice = require('../models/Invoice');
const Counter = require('../models/Counter');

async function getNextInvoiceNumber(companyId) {
  const counter = await Counter.findOneAndUpdate(
    { company_id: companyId, model: 'Invoice', field: 'invoiceNumber' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  if (!counter.prefix || counter.prefix === 'LD-') {
     counter.prefix = 'INV-';
     await counter.save();
  }
  return `${counter.prefix}${counter.seq}`;
}

/**
 * Automatically creates an invoice for a WON deal.
 */
async function autoGenerateInvoice(deal, userId) {
  try {
    // Check if an invoice already exists for this deal
    const existing = await Invoice.findOne({ deal_id: deal._id, company_id: deal.company_id });
    if (existing) return existing;

    const invoiceNumber = await getNextInvoiceNumber(deal.company_id);
    
    // Fetch Company settings for info
    const Company = require('../models/Company');
    const company = await Company.findById(deal.company_id);
    
    // Fetch Customer for full address/info
    const Customer = require('../models/Customer');
    const customer = await Customer.findById(deal.customer_id);

    const invoice = await Invoice.create({
      company_id: deal.company_id,
      customer_id: deal.customer_id,
      deal_id: deal._id,
      invoice_number: invoiceNumber,
      invoice_date: new Date(),
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
      items: [
        {
          description: `Product/Service for Deal: ${deal.name}`,
          quantity: 1,
          price: deal.value,
          amount: deal.value
        }
      ],
      subtotal: deal.value,
      discount: 0,
      tax_rate: 0,
      tax_amount: 0,
      total_amount: deal.value,
      paid_amount: 0,
      status: 'Unpaid',
      gst_number: company?.gst_number || '',
      terms_and_conditions: 'Thank you for your business. Please pay within 7 days.',
      company_info: {
        name: company?.name || 'Company Name',
        address: company?.address || '',
        phone: company?.phone || '',
        email: company?.email || ''
      },
      customer_info: {
        name: customer?.name || 'Customer Name',
        phone: customer?.phone || '',
        email: customer?.email || '',
        address: customer?.address || ''
      },
      created_by: userId
    });

    const { logActivity } = require('./activityLogger');
    await logActivity({
      company_id: deal.company_id,
      created_by: userId,
      activity_type: 'Invoice Generated',
      category: 'system',
      description: `Bill generated for deal: ${deal.name} (Amount: ₹${deal.value})`,
      related_to: invoice._id,
      related_type: 'Invoice',
      color_code: 'purple'
    });

    return invoice;
  } catch (error) {
    console.error('Error auto-generating invoice:', error);
    return null;
  }
}

module.exports = { autoGenerateInvoice };
