const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function checkDeals() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crm');
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const deals = await db.collection('deals').find({}).toArray();
    
    console.log(`Found ${deals.length} deals`);
    deals.forEach(deal => {
      console.log(`- ID: ${deal._id}, Type: ${typeof deal._id}, InstanceOf ObjectId: ${deal._id instanceof mongoose.Types.ObjectId}, Constructor: ${deal._id.constructor.name}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkDeals();
