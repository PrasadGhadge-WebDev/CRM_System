const dotenv = require('dotenv');
const { connectDB } = require('../config/db');
const { ensureDefaultAdmin } = require('../utils/defaultAdmin');
const logger = require('../utils/logger');

dotenv.config();

async function run() {
  try {
    await connectDB();
    const admin = await ensureDefaultAdmin();

    logger.info(`Admin seed complete for ${admin.email}`);
    process.exit(0);
  } catch (error) {
    logger.error('Admin seed failed', error.message || error);
    process.exit(1);
  }
}

run();
