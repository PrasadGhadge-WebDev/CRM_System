const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');
const SystemSettings = require('../models/SystemSettings');
require('dotenv').config();

async function testRegistration() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    const testEmail = `test_${Date.now()}@example.com`;
    const testPhone = `90000${Math.floor(Math.random() * 100000)}`;

    console.log(`Attempting registration for ${testEmail}...`);

    // Mocking the register flow logic
    const company = await Company.create({
      company_name: `Test Workspace ${Date.now()}`,
      email: testEmail,
      phone: testPhone,
      status: 'active',
    });
    console.log('Company created:', company._id);

    const user = await User.create({
      username: testEmail.split('@')[0],
      name: 'Test User',
      email: testEmail,
      phone: testPhone,
      role: 'Admin',
      company_id: company._id,
      status: 'active',
      password: 'Password123',
      is_trial: true,
      is_demo: false,
    });
    console.log('User created:', user._id);

    try {
      await SystemSettings.create({
        company_id: company._id,
        companyName: company.company_name,
      });
      console.log('SystemSettings created.');
    } catch (ssErr) {
      console.error('SystemSettings Error:', ssErr);
      throw ssErr;
    }

    console.log('Registration flow SUCCESSFUL.');
    process.exit(0);
  } catch (err) {
    console.error('Registration flow FAILED:');
    console.error(err);
    process.exit(1);
  }
}

testRegistration();
