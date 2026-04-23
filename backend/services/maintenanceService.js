const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Order = require('../models/Order');

/**
 * AI Sathi Maintenance: Auto-inactivate stale customers
 * Rule: If a customer has no 'paid' orders in the last 180 days, set status to Inactive.
 */
async function autoInactivateStaleCustomers() {
  console.log('[Maintenance] Starting Churn Guard check...');
  
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - 180);

  // 1. Get all active customers
  const activeCustomers = await Customer.find({ status: 'Active' });
  let inactivatedCount = 0;

  for (const customer of activeCustomers) {
    // 2. Check for recent paid orders
    const recentOrder = await Order.findOne({
      customer_id: customer._id,
      status: 'paid',
      created_at: { $gte: thresholdDate }
    });

    if (!recentOrder) {
      // 3. Check if customer was created recently (within 180 days)
      if (customer.created_at < thresholdDate) {
        customer.status = 'Inactive';
        customer.notes = (customer.notes || '') + `\n[System] Auto-inactivated due to 180 days of inactivity.`;
        await customer.save();
        inactivatedCount++;
        console.log(`[Maintenance] Inactivated: ${customer.name} (${customer._id})`);
      }
    }
  }

  console.log(`[Maintenance] Churn Guard complete. Inactivated ${inactivatedCount} accounts.`);
}

module.exports = { autoInactivateStaleCustomers };
