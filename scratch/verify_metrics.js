const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '../backend/.env' });

async function verifyMetrics() {
  const { getMetrics } = require('../backend/controllers/metricsController');
  
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/crm';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const company = await mongoose.connection.db.collection('companies').findOne({});
  if (!company) {
    console.log('No company found in DB');
    process.exit(1);
  }

  const req = {
    user: {
      role: 'Manager',
      company_id: company._id
    }
  };
  
  const res = {
    json: (data) => {
      console.log('Metrics Summary:', JSON.stringify(data.summary, null, 2));
      process.exit(0);
    }
  };

  try {
    await getMetrics(req, res);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

verifyMetrics();
