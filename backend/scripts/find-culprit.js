const mongoose = require('mongoose');
require('dotenv').config();

async function findTheCulprit() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const collInfo of collections) {
      const collName = collInfo.name;
      const indexes = await mongoose.connection.db.collection(collName).indexes();
      for (const idx of indexes) {
        if (idx.unique) {
          console.log(`[${collName}] Unique Index: ${idx.name} - ${JSON.stringify(idx.key)}`);
        }
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

findTheCulprit();
