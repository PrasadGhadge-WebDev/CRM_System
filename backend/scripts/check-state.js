const mongoose = require('mongoose');
const Company = require('../models/Company');
const User = require('../models/User');
const SystemSettings = require('../models/SystemSettings');
require('dotenv').config();

async function checkState() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ email: 'parmesh@gmail.com' });
    if (!user) {
      console.log('User not found.');
      process.exit(0);
    }
    console.log('User:', user._id);
    const company = await Company.findById(user.company_id);
    console.log('Company:', company ? company._id : 'NOT FOUND');
    const settings = await SystemSettings.findOne({ company_id: user.company_id });
    console.log('Settings:', settings ? 'FOUND' : 'NOT FOUND');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
checkState();
