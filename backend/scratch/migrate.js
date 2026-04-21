const mongoose = require('mongoose');

async function migrate() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/crm');
    const db = mongoose.connection.db;
    
    // Find the primary admin to get their company_id
    const admin = await db.collection('users').findOne({email: 'admin@crm.com'});
    const adminComp = admin.company_id;
    console.log('Migrating all isolated bulk data to Company:', adminComp);
    
    const collections = [
      'leads', 'deals', 'customers', 'activities', 
      'notes', 'leadnotes', 'supporttickets'
    ];
    
    for (const c of collections) {
      const res = await db.collection(c).updateMany(
        {}, 
        { $set: { company_id: adminComp } }
      );
      console.log(`Migrated ${c}: ${res.modifiedCount} records assigned to your workspace`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
}

migrate();
