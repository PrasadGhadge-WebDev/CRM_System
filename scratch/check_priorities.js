const mongoose = require('mongoose');
const Lead = require('./backend/models/Lead');
require('dotenv').config({ path: './backend/.env' });

async function checkLeads() {
  await mongoose.connect(process.env.MONGO_URI);
  const leads = await Lead.find({ priority: 'Warm' }).limit(5);
  console.log('Leads with priority Warm:', leads.length);
  const allLeads = await Lead.find({}).limit(10).select('priority');
  console.log('Recent priorities:', allLeads.map(l => l.priority));
  process.exit(0);
}

checkLeads();
