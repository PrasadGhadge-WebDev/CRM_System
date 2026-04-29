const mongoose = require('mongoose');
const Deal = require('../models/Deal');
require('dotenv').config({ path: '../.env' });

async function cleanup() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crm');
    console.log('Connected.');

    // 1. Fix Invalid Stages
    console.log('Fixing invalid stages...');
    const invalidStages = ['NEWED', 'PROPOSAL']; // Add others if known
    await Deal.updateMany(
      { stage: { $in: invalidStages } },
      { stage: 'New' }
    );
    // Specifically fix 'Proposal Sent' vs 'Proposal'
    await Deal.updateMany(
      { stage: 'Proposal' },
      { stage: 'Proposal Sent' }
    );
    console.log('Stages cleaned.');

    // 2. Remove Duplicates
    console.log('Analyzing duplicates...');
    const deals = await Deal.find({ is_deleted: { $ne: true } }).sort({ created_at: 1 });
    const seen = new Set();
    const toDelete = [];

    for (const deal of deals) {
      const key = `${deal.company_id}_${deal.customer_id}_${deal.name}_${deal.value}`;
      if (seen.has(key)) {
        toDelete.push(deal._id);
      } else {
        seen.add(key);
      }
    }

    if (toDelete.length > 0) {
      console.log(`Found ${toDelete.length} duplicates. Removing...`);
      await Deal.deleteMany({ _id: { $in: toDelete } });
      console.log('Duplicates removed.');
    } else {
      console.log('No duplicates found.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  }
}

cleanup();
