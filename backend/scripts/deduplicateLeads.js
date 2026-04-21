/**
 * One-time deduplication script for Lead records.
 * Keeps the OLDEST document per (company_id + email) and (company_id + phone).
 * Soft-deletes newer duplicates so the unique compound indexes can be built.
 *
 * Run with: node scripts/deduplicateLeads.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('../models/Lead');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  let totalDeleted = 0;
  const alreadyDeleted = new Set();

  // ── Deduplicate by EMAIL ──────────────────────────────────────────────────
  const emailGroups = await Lead.aggregate([
    {
      $match: {
        email: { $exists: true, $ne: '' },
        deleted_at: { $exists: false },
      },
    },
    {
      $group: {
        _id:   { company_id: '$company_id', email: { $toLower: '$email' } },
        ids:   { $push: '$_id' },
        dates: { $push: '$created_at' },
        names: { $push: '$name' },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  for (const grp of emailGroups) {
    const pairs = grp.ids.map((id, i) => ({ id, date: grp.dates[i], name: grp.names[i] }));
    pairs.sort((a, b) => new Date(a.date) - new Date(b.date));
    const [keeper, ...dupes] = pairs;
    console.log(`\n[EMAIL "${grp._id.email}"] Keeping "${keeper.name}" (${keeper.id})`);

    for (const d of dupes) {
      await Lead.findByIdAndUpdate(d.id, { deleted_at: new Date() });
      console.log(`  ↳ Soft-deleted "${d.name}" (${d.id})`);
      alreadyDeleted.add(String(d.id));
      totalDeleted++;
    }
  }

  // ── Deduplicate by PHONE ──────────────────────────────────────────────────
  const phoneGroups = await Lead.aggregate([
    {
      $match: {
        phone: { $exists: true, $ne: '' },
        deleted_at: { $exists: false },
      },
    },
    {
      $group: {
        _id:   { company_id: '$company_id', phone: '$phone' },
        ids:   { $push: '$_id' },
        dates: { $push: '$created_at' },
        names: { $push: '$name' },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  for (const grp of phoneGroups) {
    const pairs = grp.ids.map((id, i) => ({ id, date: grp.dates[i], name: grp.names[i] }));
    pairs.sort((a, b) => new Date(a.date) - new Date(b.date));
    const [keeper, ...dupes] = pairs;
    console.log(`\n[PHONE "${grp._id.phone}"] Keeping "${keeper.name}" (${keeper.id})`);

    for (const d of dupes) {
      if (alreadyDeleted.has(String(d.id))) {
        console.log(`  ↳ Already soft-deleted ${d.id} — skip`);
        continue;
      }
      await Lead.findByIdAndUpdate(d.id, { deleted_at: new Date() });
      console.log(`  ↳ Soft-deleted "${d.name}" (${d.id})`);
      alreadyDeleted.add(String(d.id));
      totalDeleted++;
    }
  }

  console.log(`\n✅ Done. Total duplicates removed: ${totalDeleted}`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('❌ Script failed:', err.message);
  process.exit(1);
});
