const mongoose = require('mongoose');
require('dotenv').config();

async function aggressiveCleanup() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    const toDrop = [
      { coll: 'leadstatuses', idx: 'value_1' },
      { coll: 'demo_users', idx: 'username_1' },
      { coll: 'demo_users', idx: 'employee_id_1' },
      { coll: 'industrytypes', idx: 'value_1' },
      { coll: 'customertypes', idx: 'value_1' },
    ];

    for (const item of toDrop) {
      try {
        console.log(`Dropping ${item.idx} from ${item.coll}...`);
        await mongoose.connection.db.collection(item.coll).dropIndex(item.idx);
      } catch (e) {
        console.log(`Could not drop ${item.idx} from ${item.coll}: ${e.message}`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
aggressiveCleanup();
