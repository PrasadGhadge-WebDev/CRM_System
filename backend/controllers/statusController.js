const Status = require('../models/Status');
const Lead = require('../models/Lead');
const Deal = require('../models/Deal');
const Customer = require('../models/Customer');
const { asyncHandler } = require('../middleware/asyncHandler');

// @desc    Get statuses by type
// @route   GET /api/statuses
// @access  Admin/Manager
exports.getStatuses = asyncHandler(async (req, res) => {
  const { type } = req.query;
  const filter = { company_id: req.user.company_id };
  if (type) filter.type = type;

  const statuses = await Status.find(filter).sort({ order: 1 });
  res.ok(statuses);
});

// @desc    Create/Update status
// @route   POST /api/statuses
// @access  Admin
exports.upsertStatus = asyncHandler(async (req, res) => {
  const { id, name, type, color, order, is_default, status } = req.body;

  if (is_default) {
    // Reset other defaults for this type
    await Status.updateMany(
      { company_id: req.user.company_id, type: type || 'lead' },
      { is_default: false }
    );
  }

  let doc;
  if (id) {
    doc = await Status.findByIdAndUpdate(
      id,
      { name, color, order, is_default, status },
      { new: true, runValidators: false }
    );
  } else {
    // Auto-order if not provided
    let finalOrder = order;
    if (finalOrder === undefined) {
      const last = await Status.findOne({ company_id: req.user.company_id, type }).sort({ order: -1 });
      finalOrder = last ? last.order + 1 : 0;
    }

    doc = await Status.create({
      company_id: req.user.company_id,
      name,
      type,
      color,
      order: finalOrder,
      is_default: !!is_default,
      status: status || 'active'
    });
  }

  res.ok(doc, id ? 'Status updated' : 'Status created');
});

// @desc    Reorder statuses
// @route   PUT /api/statuses/reorder
// @access  Admin
exports.reorderStatuses = asyncHandler(async (req, res) => {
  const { items } = req.body; // Array of { id, order }

  if (!items || !Array.isArray(items)) {
    return res.fail('Invalid items array', 400);
  }

  const ops = items.map(item => ({
    updateOne: {
      filter: { _id: item.id, company_id: req.user.company_id },
      update: { order: item.order }
    }
  }));

  await Status.bulkWrite(ops);
  res.ok(null, 'Statuses reordered');
});

// @desc    Delete status
// @route   DELETE /api/statuses/:id
// @access  Admin
exports.deleteStatus = asyncHandler(async (req, res) => {
  const doc = await Status.findById(req.params.id);

  if (!doc) {
    return res.fail('Status not found', 404);
  }

  // Check if used
  let usedCount = 0;
  if (doc.type === 'lead') {
    usedCount = await Lead.countDocuments({ company_id: req.user.company_id, status: doc.name });
  } else if (doc.type === 'deal') {
    usedCount = await Deal.countDocuments({ company_id: req.user.company_id, status: doc.name });
  } else if (doc.type === 'customer') {
    usedCount = await Customer.countDocuments({ company_id: req.user.company_id, status: doc.name });
  }

  if (usedCount > 0) {
    return res.fail(`Cannot delete status: ${usedCount} records are currently using this status.`, 400);
  }

  await doc.deleteOne();
  res.ok(null, 'Status deleted successfully');
});
