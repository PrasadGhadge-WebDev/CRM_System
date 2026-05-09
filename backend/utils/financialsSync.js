const Customer = require('../models/Customer');
const Deal = require('../models/Deal');
const Payment = require('../models/Payment');
const { logActivity } = require('./activityLogger');

/**
 * Synchronizes a customer's financial metrics based on linked deals and payments.
 * Implements Step 4 & 5 of the Customer Module.
 */
async function syncCustomerFinancials(customerId, companyId, userId) {
  if (!customerId) return;

  // 1. Calculate Total Won Deal Value
  const deals = await Deal.find({
    customer_id: customerId,
    company_id: companyId,
    stage: 'Won',
    isDeleted: { $ne: true }
  });
  
  const totalDealValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);

  // 2. Calculate Total Paid Amount
  const payments = await Payment.find({
    customer_id: customerId,
    company_id: companyId,
    isDeleted: { $ne: true }
  });

  const totalPaidAmount = payments.reduce((sum, p) => sum + (p.paid_amount || 0), 0);

  // 3. Calculate Pending
  const pendingAmount = Math.max(0, totalDealValue - totalPaidAmount);

  // 4. Determine Payment Status
  let status = 'Pending';
  if (totalDealValue > 0) {
    if (totalPaidAmount >= totalDealValue) {
      status = 'Paid';
    } else if (totalPaidAmount > 0) {
      status = 'Partial';
    } else {
      status = 'Pending';
    }
  }

  // 5. Update Customer Record
  const oldCustomer = await Customer.findById(customerId);
  const updatedCustomer = await Customer.findByIdAndUpdate(customerId, {
    total_deal_value: totalDealValue,
    paid_amount: totalPaidAmount,
    pending_amount: pendingAmount,
    payment_status: status
  }, { new: true });

  // 6. Log System Activity (Audit Trail - Step 7)
  if (oldCustomer && (oldCustomer.paid_amount !== totalPaidAmount || oldCustomer.total_deal_value !== totalDealValue)) {
    await logActivity({
      activity_type: oldCustomer.paid_amount !== totalPaidAmount ? 'Payment Updated' : 'Payment Received',
      category: 'system',
      description: `Financials synced. Total Deal: ₹${totalDealValue}, Paid: ₹${totalPaidAmount}, Pending: ₹${pendingAmount}. Status: ${status}`,
      related_to: customerId,
      related_type: 'Customer',
      company_id: companyId,
      created_by: userId,
      color_code: status === 'Paid' ? 'green' : 'blue'
    });
  }

  return updatedCustomer;
}

/**
 * Synchronizes a deal's financial metrics based on its linked payments.
 */
async function syncDealFinancials(dealId, companyId) {
  if (!dealId) return;

  const payments = await Payment.find({
    deal_id: dealId,
    company_id: companyId,
    status: { $in: ['Paid', 'Partial'] },
    isDeleted: { $ne: true }
  });

  const totalPaid = payments.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
  
  const deal = await Deal.findOne({ _id: dealId, company_id: companyId });
  if (!deal) return;

  let paymentStatus = 'Unpaid';
  if (deal.value > 0) {
    if (totalPaid >= deal.value) {
      paymentStatus = 'Paid';
    } else if (totalPaid > 0) {
      paymentStatus = 'Partial';
    }
  }

  return await Deal.findByIdAndUpdate(dealId, {
    paid_amount: totalPaid,
    payment_status: paymentStatus
  }, { new: true });
}

module.exports = {
  syncCustomerFinancials,
  syncDealFinancials
};
