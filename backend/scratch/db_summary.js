const mongoose = require('mongoose');

async function getDbSummary() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/crm');
    
    console.log('--- DATABASE SUMMARY ---\n');
    
    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('COLLECTIONS AND COUNTS:');
    for (const collection of collections) {
      const name = collection.name;
      const count = await mongoose.connection.db.collection(name).countDocuments();
      console.log(`- ${name}: ${count} documents`);
    }
    
    console.log('\n--- USERS IN DATABASE ---\n');
    
    // Get all users
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    
    users.forEach((user, idx) => {
      console.log(`User #${idx + 1}`);
      console.log(`  Name:      ${user.name}`);
      console.log(`  Username:  ${user.username}`);
      console.log(`  Email:     ${user.email}`);
      console.log(`  Role:      ${user.role}`);
      console.log(`  Status:    ${user.status}`);
      console.log(`  CreatedAt: ${user.created_at}`);
      console.log('  -------------------------');
    });
    
    console.log(`\nTotal Users Found: ${users.length}`);

  } catch (err) {
    console.error('Error fetching database summary:', err);
  } finally {
    mongoose.connection.close();
  }
}

getDbSummary();
