const mongoose = require('mongoose');
const dotenv = require('dotenv');
const LeadStatus = require('../models/LeadStatus');
const LeadSource = require('../models/LeadSource');
const CustomerType = require('../models/CustomerType');
const IndustryType = require('../models/IndustryType');

dotenv.config();

const data = {
  'lead-status': [
    { label: 'New', value: 'new', color: '#fbbf24', order: 1 }, // Yellow
    { label: 'Contacted', value: 'contacted', color: '#3b82f6', order: 2 }, // Blue
    { label: 'Qualified', value: 'qualified', color: '#a855f7', order: 3 }, // Purple
    { label: 'Negotiation', value: 'negotiation', color: '#fb923c', order: 4 }, // Orange
    { label: 'Won', value: 'won', color: '#22c55e', order: 5 }, // Green
    { label: 'Lost', value: 'lost', color: '#ef4444', order: 6 }, // Red
    { label: 'Junk', value: 'junk', color: '#6b7280', order: 7 }, // Gray
  ],
  'lead-source': [
    { label: 'Google Ads', value: 'google-ads', color: '#3b82f6', order: 1 },
    { label: 'Facebook', value: 'facebook', color: '#6366f1', order: 2 },
    { label: 'LinkedIn', value: 'linkedin', color: '#10b981', order: 3 },
    { label: 'Referral', value: 'referral', color: '#f59e0b', order: 4 },
    { label: 'Website', value: 'website', color: '#ec4899', order: 5 },
    { label: 'Cold Call', value: 'cold-call', color: '#ef4444', order: 6 },
    { label: 'Email Campaign', value: 'email-campaign', color: '#6b7280', order: 7 },
  ],
  'customer-type': [
    { label: 'Individual', value: 'individual', color: '#3b82f6', order: 1 },
    { label: 'Corporate', value: 'corporate', color: '#8b5cf6', order: 2 },
    { label: 'Government', value: 'government', color: '#10b981', order: 3 },
    { label: 'Non-Profit', value: 'non_profit', color: '#f59e0b', order: 4 },
  ],
  'industry-type': [
    { label: 'Technology', value: 'technology', color: '#3b82f6', order: 1 },
    { label: 'Real Estate', value: 'real_estate', color: '#8b5cf6', order: 2 },
    { label: 'Finance', value: 'finance', color: '#10b981', order: 3 },
    { label: 'Healthcare', value: 'healthcare', color: '#ef4444', order: 4 },
    { label: 'Manufacturing', value: 'manufacturing', color: '#6b7280', order: 5 },
    { label: 'Retail', value: 'retail', color: '#ec4899', order: 6 },
  ]
};

const models = {
  'lead-status': LeadStatus,
  'lead-source': LeadSource,
  'customer-type': CustomerType,
  'industry-type': IndustryType,
};

const seedMasterData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) throw new Error('MONGO_URI is not defined in environment');
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for master data seeding...');

    for (const [type, items] of Object.entries(data)) {
      const Model = models[type];
      console.log(`Seeding ${type}...`);
      for (const item of items) {
        const queryField = type === 'lead-source' ? 'name' : 'value';
        const updateData = type === 'lead-source' ? { ...item, name: item.label } : item;
        await Model.findOneAndUpdate(
          { [queryField]: item.value },
          updateData,
          { upsert: true, returnDocument: 'after' }
        );
      }
      console.log(`Synced ${items.length} items for ${type}`);
    }

    console.log('All master data seeding complete.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedMasterData();
