const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');
const SystemSettings = require('../models/SystemSettings');
const DemoUser = require('../models/DemoUser');
require('dotenv').config();

async function deleteParmesh() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    const email = 'parmesh@gmail.com';
    const user = await User.findOne({ email });
    if (user) {
      console.log(`Deleting user: ${email}`);
      const companyId = user.company_id;
      await User.deleteOne({ _id: user._id });
      if (companyId) {
        console.log(`Deleting company: ${companyId}`);
        await Company.deleteOne({ _id: companyId });
        await SystemSettings.deleteMany({ company_id: companyId });
      }
    }

    await DemoUser.deleteMany({ email });
    console.log('Cleanup complete.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
deleteParmesh();
