const mongoose = require('mongoose');
const Lead = require('./backend/models/Lead');
require('dotenv').config({ path: './backend/.env' });

async function test() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crm');
  try {
    const payload = {
      firstName: 'Test',
      lastName: 'User',
      name: 'Test User',
      email: 'test' + Date.now() + '@example.com',
      phone: '9876543210',
      status: 'New',
      source: 'Organic',
      dealAmount: 0,
      notes: 'test note',
      company_id: new mongoose.Types.ObjectId(),
      createdBy: new mongoose.Types.ObjectId(),
      assignedTo: new mongoose.Types.ObjectId(),
      leadId: 'LD-TEST-1',
      priority: 'Warm',
      address: '',
      city: '',
      state: '',
      pincode: '',
      whatsapp_available: false,
      email_verified: false
    };
    const doc = await Lead.create(payload);
    console.log('Success:', doc._id);
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    mongoose.disconnect();
  }
}

test();
