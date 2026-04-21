const TrashEntry = require('../models/TrashEntry');
const { asyncHandler } = require('../middleware/asyncHandler');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Deal = require('../models/Deal');
const Activity = require('../models/Activity');

const MODEL_MAP = {
  lead: Lead,
  customer: Customer,
  deal: Deal,
  activity: Activity,
};

function buildSearchQuery(q) {
  if (!q) return null;
  const safe = String(q).trim();
  if (!safe) return null;
  return { $regex: safe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
}

exports.listTrash = asyncHandler(async (req, res) => {
  const { q, entityType, page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const search = buildSearchQuery(q);

  const filter = {};
  if (req.user?.company_id) {
    filter.company_id = req.user.company_id;
  }
  if (entityType) filter.entity_type = String(entityType).trim();
  if (search) filter.title = search;

  const [items, total] = await Promise.all([
    TrashEntry.find(filter)
      .populate('deleted_by', 'name email role')
      .sort({ deleted_at: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    TrashEntry.countDocuments(filter),
  ]);

  res.ok({ items, total, page: pageNum, limit: limitNum });
});

exports.restoreTrashItem = asyncHandler(async (req, res) => {
  const entry = await TrashEntry.findById(req.params.id);
  if (!entry) return res.fail('Trash item not found', 404);

  if (entry.entity_type === 'lead-source' || entry.entity_type === 'lead-status') {
    const SystemSettings = require('../models/SystemSettings');
    const settings = await SystemSettings.findOne({ company_id: req.user.company_id });
    if (settings) {
      const collection = entry.entity_type === 'lead-source' ? settings.leadSources : settings.leadStatuses;
      const subdoc = collection.id(entry.entity_id);
      if (subdoc) {
        subdoc.isDeleted = false;
        subdoc.deletedAt = null;
        subdoc.deletedBy = null;
        await settings.save();
      }
    }
  } else {
    const Model = MODEL_MAP[entry.entity_type];
    if (!Model) return res.fail(`Restore not supported for ${entry.entity_type}`, 400);

    const record = await Model.findOne({ _id: entry.entity_id }).setOptions({ isDeleted: true });
    if (record) {
      if (typeof record.restore === 'function') {
        await record.restore();
      } else {
        record.isDeleted = false;
        await record.save();
      }
    }
  }

  await entry.deleteOne();
  res.ok(null, 'Item restored successfully');
});

exports.deleteTrashItem = asyncHandler(async (req, res) => {
  const entry = await TrashEntry.findById(req.params.id);
  if (!entry) return res.fail('Trash item not found', 404);

  if (entry.entity_type === 'lead-source' || entry.entity_type === 'lead-status') {
    const SystemSettings = require('../models/SystemSettings');
    const settings = await SystemSettings.findOne({ company_id: req.user.company_id });
    if (settings) {
      const collection = entry.entity_type === 'lead-source' ? settings.leadSources : settings.leadStatuses;
      collection.pull({ _id: entry.entity_id });
      await settings.save();
    }
  } else {
    const Model = MODEL_MAP[entry.entity_type];
    if (Model) {
      await Model.deleteOne({ _id: entry.entity_id }).setOptions({ isDeleted: true });
    }
  }

  await entry.deleteOne();
  res.ok(null, 'Item permanently deleted');
});
