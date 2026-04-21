/**
 * One-time deduplication script for Customer records.
 * Keeps the OLDEST document per (company_id + email) and (company_id + phone).
 * Soft-deletes all duplicate newer records.
 *
 * Run with: node scripts/deduplicateCustomers.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('../models/Customer');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  let totalDeleted = 0;

  // ── Deduplicate by EMAIL ──────────────────────────────────────
  const emailGroups = await Customer.aggregate([
    { $match: { email: { $exists: true, $ne: '' }, deleted_at: { $exists: false } } },
    {
      $group: {
        _id: { company_id: '$company_id', email: { $toLower: '$email' } },
        ids:   { $push: '$_id' },
        dates: { $push: '$created_at' },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  for (const grp of emailGroups) {
    // Sort: oldest first (keep), rest are duplicates
    const pairs = grp.ids.map((id, i) => ({ id, date: grp.dates[i] }));
    pairs.sort((a, b) => new Date(a.date) - new Date(b.date));
    const [keeper, ...dupes] = pairs;
    console.log(`\n[EMAIL] Keeping ${keeper.id} — removing ${dupes.length} duplicate(s) with email "${grp._id.email}"`);

    for (const d of dupes) {
      await Customer.findByIdAndUpdate(d.id, { deleted_at: new Date(), deleted_by: null });
      console.log(`  ↳ Soft-deleted ${d.id}`);
      totalDeleted++;
    }
  }

  // ── Deduplicate by PHONE ──────────────────────────────────────
  const phoneGroups = await Customer.aggregate([
    { $match: { phone: { $exists: true, $ne: '' }, deleted_at: { $exists: false } } },
    {
      $group: {
        _id:   { company_id: '$company_id', phone: '$phone' },
        ids:   { $push: '$_id' },
        dates: { $push: '$created_at' },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  for (const grp of phoneGroups) {
    const pairs = grp.ids.map((id, i) => ({ id, date: grp.dates[i] }));
    pairs.sort((a, b) => new Date(a.date) - new Date(b.date));
    const [keeper, ...dupes] = pairs;
    console.log(`\n[PHONE] Keeping ${keeper.id} — removing ${dupes.length} duplicate(s) with phone "${grp._id.phone}"`);

    for (const d of dupes) {
      // Check if already soft-deleted by email dedup above
      const doc = await Customer.findById(d.id);
      if (!doc || doc.deleted_at) { console.log(`  ↳ Already deleted ${d.id} — skip`); continue; }
      await Customer.findByIdAndUpdate(d.id, { deleted_at: new Date(), deleted_by: null });
      console.log(`  ↳ Soft-deleted ${d.id}`);
      totalDeleted++;
    }
  }

  console.log(`\n✅ Done. Total duplicates removed: ${totalDeleted}`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
