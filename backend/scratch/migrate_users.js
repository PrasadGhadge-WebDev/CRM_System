const mongoose = require('mongoose');

async function migrateUsers() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/crm');
    const db = mongoose.connection.db;
    
    // Find the primary admin to get their company_id
    const admin = await db.collection('users').findOne({email: 'admin@crm.com'});
    const adminComp = admin.company_id;
    console.log('Migrating all users to Company:', adminComp);
    
    const res = await db.collection('users').updateMany(
      { _id: { $ne: admin._id } }, 
      { $set: { company_id: adminComp } }
    );
    console.log(`Migrated users: ${res.modifiedCount} records assigned to your workspace`);
    
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
}

migrateUsers();
