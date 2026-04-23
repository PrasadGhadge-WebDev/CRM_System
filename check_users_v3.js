const mongoose = require('mongoose');
const dotenv = require('dotenv');
const DemoUser = require('./backend/models/DemoUser');

dotenv.config({ path: './backend/.env' });

async function checkLastUser() {
  await mongoose.connect(process.env.MONGO_URI);
  const lastUser = await DemoUser.findOne().sort({ created_at: -1 }).select('+approval_token +approval_token_expires');
  console.log('Last User:', JSON.stringify(lastUser, null, 2));
  await mongoose.disconnect();
}

checkLastUser();
