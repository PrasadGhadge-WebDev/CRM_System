const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crm');
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('leadsources');
    
    console.log('Listing indexes for leadsources...');
    const indexes = await collection.indexes();
    console.log(indexes);
    
    if (indexes.some(idx => idx.name === 'value_1')) {
      console.log('Dropping index: value_1');
      await collection.dropIndex('value_1');
      console.log('Index value_1 dropped');
    } else {
      console.log('Index value_1 not found');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error during cleanup:', err);
    process.exit(1);
  }
}

cleanup();
