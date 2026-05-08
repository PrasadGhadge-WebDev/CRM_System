const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function findUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ 
      $or: [
        { email: 'parmesh@gmail.com' },
        { phone: '9845684545' }
      ]
    });
    console.log('User found:', user);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
findUser();
