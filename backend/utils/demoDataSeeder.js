const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Deal = require('../models/Deal');
const Activity = require('../models/Activity');
const Note = require('../models/Note');
const LeadNote = require('../models/LeadNote');
const Product = require('../models/Product');
const Order = require('../models/Order');
const SupportTicket = require('../models/SupportTicket');
const Notification = require('../models/Notification');

const seedDemoData = async (companyId, userId, userModel = 'User') => {
  if (!userId) {
    console.error('[Seeder] Error: userId is required for seeding.');
    return;
  }
  const targetUserId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
  const targetUserModel = userModel === 'DemoUser' ? 'DemoUser' : 'User';
  
  try {
    // 1. Create Sample Leads
    const leadsData = [
      {
        company_id: companyId,
        leadId: 'LD-DEMO-001',
        firstName: 'John',
        lastName: 'Doe',
        name: 'John Doe - Tech Solutions',
        email: 'john@techsolutions.sample',
        phone: '9876543211',
        source: 'Website',
        status: 'Negotiation',
        dealAmount: 0,
        assignedTo: userId,
        assignedToModel: targetUserModel,
        createdBy: userId,
        createdByModel: targetUserModel,
        notes: 'Interested in enterprise license for 50 users.',
      },
      {
        company_id: companyId,
        leadId: 'LD-DEMO-002',
        firstName: 'Alice',
        lastName: 'Smith',
        name: 'Alice Smith - Global Retail',
        email: 'alice@globalretail.sample',
        phone: '9876543212',
        source: 'Referral',
        status: 'Discovery',
        dealAmount: 0,
        assignedTo: userId,
        assignedToModel: targetUserModel,
        createdBy: userId,
        createdByModel: targetUserModel,
        notes: 'New store opening soon. Needs POS integration.',
      },
      {
        company_id: companyId,
        leadId: 'LD-DEMO-003',
        firstName: 'Bob',
        lastName: 'Wilson',
        name: 'Bob Wilson - Creative Agency',
        email: 'bob@creative.sample',
        phone: '9876543213',
        source: 'LinkedIn',
        status: 'Proposal',
        dealAmount: 0,
        assignedTo: userId,
        assignedToModel: targetUserModel,
        createdBy: userId,
        createdByModel: targetUserModel,
        notes: 'Looking to optimize their project tracking.',
      },
      {
        company_id: companyId,
        leadId: 'LD-DEMO-004',
        firstName: 'Maya',
        lastName: 'Patel',
        name: 'Maya Patel - FinEdge',
        email: 'maya@finedge.sample',
        phone: '9876543214',
        source: 'Facebook Ads',
        status: 'Qualified',
        dealAmount: 0,
        assignedTo: userId,
        assignedToModel: targetUserModel,
        createdBy: userId,
        createdByModel: targetUserModel,
        notes: 'Requested a demo for finance reporting and forecasting.',
      },
      {
        company_id: companyId,
        leadId: 'LD-DEMO-005',
        firstName: 'Chris',
        lastName: 'Brown',
        name: 'Chris Brown - HealthPlus',
        email: 'chris@healthplus.sample',
        phone: '9876543215',
        source: 'Cold Call',
        status: 'New',
        dealAmount: 0,
        assignedTo: userId,
        assignedToModel: targetUserModel,
        createdBy: userId,
        createdByModel: targetUserModel,
        notes: 'Needs patient onboarding workflow and appointment reminders.',
      },
    ];
    const createdLeads = [];
    for (const lead of leadsData) {
      try {
        const created = await Lead.create(lead);
        createdLeads.push(created);
      } catch (err) {
        console.error('Lead seeding failed for:', lead.email, 'Error:', err.message);
        throw err;
      }
    }

    // 2. Create Sample Customers
    const customersData = [
      {
        company_id: companyId,
        name: 'Acme Corp',
        email: 'contact@acme.sample',
        phone: '9876543216',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        status: 'Active',
        customer_type: 'Enterprise',
        assigned_to: userId,
        assigned_to_model: targetUserModel,
      },
      {
        company_id: companyId,
        name: 'Innovate LLC',
        email: 'hello@innovate.sample',
        phone: '9876543217',
        city: 'San Francisco',
        state: 'CA',
        country: 'USA',
        status: 'Active',
        customer_type: 'Startup',
        assigned_to: userId,
        assigned_to_model: targetUserModel,
      },
      {
        company_id: companyId,
        name: 'Northwind Traders',
        email: 'ops@northwind.sample',
        phone: '9876543218',
        city: 'Chicago',
        state: 'IL',
        country: 'USA',
        status: 'Active',
        customer_type: 'SMB',
        assigned_to: userId,
        assigned_to_model: targetUserModel,
      },
      {
        company_id: companyId,
        name: 'Summit Logistics',
        email: 'support@summitlogistics.sample',
        phone: '9876543219',
        city: 'Dallas',
        state: 'TX',
        country: 'USA',
        status: 'Active',
        customer_type: 'Enterprise',
        assigned_to: userId,
        assigned_to_model: targetUserModel,
      },
    ];
    const createdCustomers = await Customer.insertMany(customersData);

    // 3. Create Sample Deals
    const dealsData = [
      {
        company_id: companyId,
        name: 'Enterprise ERP Overhaul',
        value: 50000,
        status: 'Discovery',
        customer_id: createdCustomers[0]._id,
        assigned_to: userId,
        assigned_to_model: targetUserModel,
      },
      {
        company_id: companyId,
        name: 'Legacy Migration',
        value: 25000,
        status: 'Closed Won',
        customer_id: createdCustomers[0]._id,
        assigned_to: userId,
        assigned_to_model: targetUserModel,
      },
      {
        company_id: companyId,
        name: 'Customer Support Automation',
        value: 18000,
        status: 'Proposal',
        customer_id: createdCustomers[1]._id,
        assigned_to: userId,
        assigned_to_model: targetUserModel,
      },
      {
        company_id: companyId,
        name: 'Analytics Dashboard Rollout',
        value: 12000,
        status: 'Negotiation',
        customer_id: createdCustomers[2]._id,
        assigned_to: userId,
        assigned_to_model: targetUserModel,
      },
    ];
    const createdDeals = await Deal.insertMany(dealsData);

    // 4. Create Sample Products
    const productsData = [
      {
        company_id: companyId,
        name: 'CRM Starter Pack',
        description: 'Core CRM tools for growing teams.',
        price: 499,
        category: 'Software',
        sku: 'CRM-START-001',
        stock_quantity: 75,
        status: 'active',
      },
      {
        company_id: companyId,
        name: 'Automation Suite',
        description: 'Workflow automation and reminders.',
        price: 899,
        category: 'Software',
        sku: 'CRM-AUTO-002',
        stock_quantity: 40,
        status: 'active',
      },
      {
        company_id: companyId,
        name: 'Analytics Add-on',
        description: 'Advanced reporting and dashboards.',
        price: 299,
        category: 'Add-on',
        sku: 'CRM-ANALYTICS-003',
        stock_quantity: 60,
        status: 'active',
      },
    ];
    const createdProducts = await Product.insertMany(productsData);

    // 5. Create Sample Orders
    const ordersData = [
      {
        company_id: companyId,
        customer_id: createdCustomers[0]._id,
        deal_id: createdDeals[0]._id,
        items: [
          { name: createdProducts[0].name, quantity: 2, price: createdProducts[0].price },
          { name: createdProducts[2].name, quantity: 1, price: createdProducts[2].price },
        ],
        total_amount: createdProducts[0].price * 2 + createdProducts[2].price,
        currency: 'USD',
        status: 'paid',
        notes: 'Initial annual subscription bundle.',
      },
      {
        company_id: companyId,
        customer_id: createdCustomers[2]._id,
        deal_id: createdDeals[2]._id,
        items: [
          { name: createdProducts[1].name, quantity: 1, price: createdProducts[1].price },
        ],
        total_amount: createdProducts[1].price,
        currency: 'USD',
        status: 'pending',
        notes: 'Awaiting finance approval.',
      },
    ];
    const createdOrders = await Order.insertMany(ordersData);

    // 6. Create Sample Support Tickets
    const supportTicketsData = [
      {
        company_id: companyId,
        customer_id: createdCustomers[0]._id,
        subject: 'Need help with user access setup',
        description: 'The admin team wants to bulk invite new users and assign roles quickly.',
        status: 'open',
        priority: 'high',
        assigned_to: userId,
        assigned_to_model: targetUserModel,
        category: 'Onboarding',
      },
      {
        company_id: companyId,
        customer_id: createdCustomers[1]._id,
        subject: 'Invoice shows incorrect total',
        description: 'Customer reported a mismatch between quoted price and invoice amount.',
        status: 'in-progress',
        priority: 'medium',
        assigned_to: userId,
        assigned_to_model: targetUserModel,
        category: 'Billing',
      },
    ];
    await SupportTicket.insertMany(supportTicketsData);

    // 7. Create Sample Activities
    const activitiesData = [
      {
        company_id: companyId,
        activity_type: 'call',
        description: 'Initial intro call with John Doe',
        related_to: createdLeads[0]._id,
        related_type: 'Lead',
        created_by: userId,
        created_by_model: targetUserModel,
        status: 'completed',
      },
      {
        company_id: companyId,
        activity_type: 'meeting',
        description: 'Review proposal with Acme Corp',
        related_to: createdCustomers[0]._id,
        related_type: 'Customer',
        created_by: userId,
        created_by_model: targetUserModel,
        status: 'planned',
        due_date: new Date(Date.now() + 86400000),
      },
      {
        company_id: companyId,
        activity_type: 'task',
        description: 'Prepare proposal for FinEdge demo follow-up',
        related_to: createdLeads[3]._id,
        related_type: 'Lead',
        created_by: userId,
        created_by_model: targetUserModel,
        status: 'planned',
        due_date: new Date(Date.now() + 2 * 86400000),
      },
      {
        company_id: companyId,
        activity_type: 'call',
        description: 'Check renewal readiness with Summit Logistics',
        related_to: createdCustomers[3]._id,
        related_type: 'Customer',
        created_by: userId,
        created_by_model: targetUserModel,
        status: 'planned',
        due_date: new Date(Date.now() + 3 * 86400000),
      },
    ];
    await Activity.insertMany(activitiesData);

    // 8. Create Sample Notes
    const notesData = [
      {
        company_id: companyId,
        note: 'Customer is very interested but needs to clear budget with CFO.',
        related_to: createdCustomers[0]._id,
        related_type: 'Customer',
        created_by: userId,
        created_by_model: targetUserModel,
      },
      {
        company_id: companyId,
        note: 'Send ROI summary and implementation timeline after demo.',
        related_to: createdLeads[1]._id,
        related_type: 'Lead',
        created_by: userId,
        created_by_model: targetUserModel,
      },
      {
        company_id: companyId,
        note: 'Upsell analytics package during renewal conversation.',
        related_to: createdCustomers[2]._id,
        related_type: 'Customer',
        created_by: userId,
        created_by_model: targetUserModel,
      },
    ];
    await Note.insertMany(notesData);

    const leadNotesData = [
      {
        company_id: companyId,
        lead_id: createdLeads[0]._id,
        user_id: userId,
        user_id_model: targetUserModel,
        note: 'Sent the pricing brochure. Waiting for feedback.',
      },
      {
        company_id: companyId,
        lead_id: createdLeads[2]._id,
        user_id: userId,
        user_id_model: targetUserModel,
        note: 'Discovery call completed. Needs finance approval for next steps.',
      },
      {
        company_id: companyId,
        lead_id: createdLeads[3]._id,
        user_id: userId,
        user_id_model: targetUserModel,
        note: 'Prospect is interested in patient reminders and dashboard analytics.',
      },
    ];
    await LeadNote.insertMany(leadNotesData);

    // 9. Create Sample Notifications
    const notificationsData = [
      {
        company_id: companyId,
        user_id: userId,
        user_id_model: targetUserModel,
        title: 'New lead assigned',
        message: `${createdLeads[2].name} is ready for follow-up.`,
        type: 'lead',
        is_read: false,
        linked_entity_id: createdLeads[2]._id,
        linked_entity_type: 'Lead',
      },
      {
        company_id: companyId,
        user_id: userId,
        user_id_model: targetUserModel,
        title: 'Deal moved forward',
        message: `${createdDeals[1].name} moved to Proposal stage.`,
        type: 'deal',
        is_read: false,
        linked_entity_id: createdDeals[1]._id,
        linked_entity_type: 'Deal',
      },
      {
        company_id: companyId,
        user_id: userId,
        user_id_model: targetUserModel,
        title: 'Payment received',
        message: `${createdOrders[0].currency} ${createdOrders[0].total_amount} was marked as paid for ${createdCustomers[0].name}.`,
        type: 'success',
        is_read: true,
        linked_entity_id: createdOrders[0]._id,
        linked_entity_type: 'Customer',
      },
    ];
    await Notification.insertMany(notificationsData);

    console.log(`Demo data successfully seeded for company ${companyId}`);
  } catch (error) {
    console.error('Error seeding demo data:', error);
    throw error;
  }
};

module.exports = { seedDemoData };
