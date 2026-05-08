const mongoose = require('mongoose');
require('dotenv').config();

async function deepAudit() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const collInfo of collections) {
      const collName = collInfo.name;
      const indexes = await mongoose.connection.db.collection(collName).indexes();
      console.log(`--- Collection: ${collName} ---`);
      for (const idx of indexes) {
        console.log(`Index: ${idx.name} | Unique: ${!!idx.unique} | Key: ${JSON.stringify(idx.key)}`);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
deepAudit();
