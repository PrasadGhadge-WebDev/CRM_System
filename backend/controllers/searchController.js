const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Deal = require('../models/Deal');
const { asyncHandler } = require('../middleware/asyncHandler');

exports.globalSearch = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) return res.ok({ leads: [], customers: [], deals: [] });

  const searchRegex = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };

  const [leads, customers, deals] = await Promise.all([
    Lead.find({
      $or: [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }],
    }).limit(10),
    Customer.find({
      $or: [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }],
    }).limit(10),
    Deal.find({
      name: searchRegex,
    }).populate('customer_id', 'name').limit(10),
  ]);

  res.ok({ leads, customers, deals });
});
