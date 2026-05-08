const mongoose = require('mongoose');
const Company = require('../models/Company');
const SystemSettings = require('../models/SystemSettings');
require('dotenv').config();

async function repairSettings() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    const companies = await Company.find({});
    console.log(`Checking ${companies.length} companies...`);

    for (const company of companies) {
      const settings = await SystemSettings.findOne({ company_id: company._id });
      if (!settings) {
        console.log(`Creating missing settings for company: ${company.company_name} (${company._id})`);
        await SystemSettings.create({
          company_id: company._id,
          companyName: company.company_name,
          defaultLeadStatus: 'New',
          leadSources: [
            { name: 'Google Ads', category: 'Paid' },
            { name: 'Facebook', category: 'Paid' },
            { name: 'Organic Search', category: 'Organic' },
            { name: 'Referral', category: 'Referral' },
            { name: 'Direct', category: 'Direct' }
          ],
          leadStatuses: [
            { name: 'New', color: '#fbbf24', order: 0, type: 'lead', isDefault: true, isSystem: true },
            { name: 'Contacted', color: '#3b82f6', order: 1, type: 'lead', isSystem: true },
            { name: 'Qualified', color: '#8b5cf6', order: 2, type: 'lead', isSystem: true },
            { name: 'Negotiation', color: '#fb923c', order: 3, type: 'lead', isSystem: true },
            { name: 'Won', color: '#22c55e', order: 4, type: 'lead', isSystem: true },
            { name: 'Lost', color: '#ef4444', order: 5, type: 'lead', isSystem: true }
          ]
        });
      }
    }

    console.log('Repair complete.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
repairSettings();
