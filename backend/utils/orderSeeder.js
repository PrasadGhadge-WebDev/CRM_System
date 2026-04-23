const mongoose = require('mongoose');
const Order = require('../models/Order');
const Customer = require('../models/Customer');

/**
 * AI Sathi Seeder: Create sample financial data for testing
 */
async function seedSampleOrders() {
  console.log('[Seeder] Starting order generation...');
  
  const customers = await Customer.find().limit(5);
  if (!customers.length) {
    console.log('[Seeder] No customers found to link orders to.');
    return;
  }

  for (const customer of customers) {
    // Create a paid order
    await Order.create({
      company_id: customer.company_id,
      customer_id: customer._id,
      items: [{ name: 'SaaS Subscription (Annual)', quantity: 1, price: 12000 }],
      total_amount: 12000,
      currency: 'INR',
      status: 'paid',
      notes: 'Initial activation payment.'
    });

    // Create a pending order
    await Order.create({
      company_id: customer.company_id,
      customer_id: customer._id,
      items: [{ name: 'Consulting Hours', quantity: 5, price: 2000 }],
      total_amount: 10000,
      currency: 'INR',
      status: 'pending',
      notes: 'Invoice sent for Q2 review.'
    });
  }

  console.log(`[Seeder] Seeded 2 orders for ${customers.length} customers.`);
}

module.exports = { seedSampleOrders };
