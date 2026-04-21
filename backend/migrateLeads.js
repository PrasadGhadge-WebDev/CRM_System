const mongoose = require('mongoose');
const { connectDB } = require('./config/db');
const Lead = require('./models/Lead');
const Counter = require('./models/Counter');
const dotenv = require('dotenv');

dotenv.config();

async function migrate() {
  try {
    await connectDB();
    console.log('Connected to MongoDB for migration...');

    const leads = await Lead.find({});
    console.log(`Found ${leads.length} leads to migrate.`);

    for (const lead of leads) {
      const updates = {};
      const leadObj = lead.toObject();

      // 1. Name split if needed
      if (!leadObj.firstName && leadObj.name) {
        const [first = '', ...rest] = leadObj.name.split(' ');
        updates.firstName = first;
        updates.lastName = rest.join(' ');
      }

      // 2. camelCase mappings
      if (leadObj.assigned_to) updates.assignedTo = leadObj.assigned_to;
      if (leadObj.estimated_value) updates.dealAmount = leadObj.estimated_value;
      if (leadObj.follow_up_date) updates.followUpDate = leadObj.follow_up_date;
      if (leadObj.company_name) updates.company = leadObj.company_name;

      // 3. Lead ID generation if missing
      if (!leadObj.leadId) {
        const counter = await Counter.findOneAndUpdate(
          { company_id: leadObj.company_id, model: 'Lead', field: 'leadId' },
          { $inc: { seq: 1 } },
          { upsert: true, new: true }
        );
        const seq = counter.seq;
        updates.leadId = `LD-${1000 + seq}`;
      }

      if (Object.keys(updates).length > 0) {
        await Lead.updateOne({ _id: lead._id }, { $set: updates });
        console.log(`Migrated lead: ${lead._id} -> ${updates.leadId || leadObj.leadId}`);
      }
    }

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
