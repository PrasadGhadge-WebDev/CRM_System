const mongoose = require('mongoose');
const User = require('./models/User');

async function run() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/crm');
    const result = await User.aggregate([
      { $group: { _id: '$company_id', count: { $sum: 1 } } }
    ]);
    console.log('Users per company:');
    console.log(result);
    const total = await User.countDocuments();
    console.log('Total users:', total);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();