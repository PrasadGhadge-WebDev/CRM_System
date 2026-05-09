const SystemSettings = require('../models/SystemSettings');
const { asyncHandler } = require('../middleware/asyncHandler');

// @desc    Get company settings
// @route   GET /api/settings
exports.getSettings = asyncHandler(async (req, res) => {
  let settings = await SystemSettings.findOne({ company_id: req.user.company_id });

  if (!settings) {
    // Create default settings if not exists
    settings = await SystemSettings.create({
      company_id: req.user.company_id,
      leadSources: [
        { name: 'Google Ads', category: 'Paid' },
        { name: 'Facebook', category: 'Paid' },
        { name: 'Organic Search', category: 'Organic' },
        { name: 'Referral', category: 'Referral' },
        { name: 'Direct', category: 'Direct' }
      ],
      leadStatuses: [
        { name: 'NEW', color: '#fbbf24', order: 0, type: 'lead', isDefault: true, isSystem: true },
        { name: 'CONTACTED', color: '#3b82f6', order: 1, type: 'lead', isSystem: true },
        { name: 'QUALIFIED', color: '#8b5cf6', order: 2, type: 'lead', isSystem: true },
        { name: 'NEGOTIATION', color: '#fb923c', order: 3, type: 'lead', isSystem: true },
        { name: 'WON', color: '#22c55e', order: 4, type: 'lead', isSystem: true },
        { name: 'LOST', color: '#ef4444', order: 5, type: 'lead', isSystem: true }
      ],
      customerTypes: [
        { name: 'Individual' },
        { name: 'Corporate' },
        { name: 'Government' },
        { name: 'Non-Profit' }
      ],
      customerCategories: [
        { name: 'Premium' },
        { name: 'Standard' },
        { name: 'Trial' }
      ]
    });
  }

  res.ok(settings);
});

// @desc    Update settings (generic)
// @route   PUT /api/settings
exports.updateSettings = asyncHandler(async (req, res) => {
  const settings = await SystemSettings.findOneAndUpdate(
    { company_id: req.user.company_id },
    req.body,
    { new: true, runValidators: true }
  );

  if (!settings) return res.fail('Settings not found', 404);
  res.ok(settings);
});

// @desc    Add/Update Lead Source
// @route   POST /api/settings/sources
exports.saveLeadSource = asyncHandler(async (req, res) => {
  const { id, name, category, isActive } = req.body;
  const settings = await SystemSettings.findOne({ company_id: req.user.company_id });
  
  if (!settings) return res.fail('Settings not found', 404);

  if (id) {
    const source = settings.leadSources.id(id);
    if (source) {
      source.name = name || source.name;
      source.category = category || source.category;
      source.isActive = isActive !== undefined ? isActive : source.isActive;
    }
  } else {
    settings.leadSources.push({ name, category, isActive });
  }

  await settings.save();
  res.ok(settings);
});

// @desc    Add/Update Lead Status
// @route   POST /api/settings/statuses
exports.saveLeadStatus = asyncHandler(async (req, res) => {
  const { id, name, color, order, type, isDefault, isActive } = req.body;
  const settings = await SystemSettings.findOne({ company_id: req.user.company_id });
  
  if (!settings) return res.fail('Settings not found', 404);

  if (id) {
    const status = settings.leadStatuses.id(id);
    if (status) {
      status.name = name || status.name;
      status.color = color || status.color;
      status.order = order !== undefined ? order : status.order;
      status.type = type || status.type;
      status.isDefault = isDefault !== undefined ? isDefault : status.isDefault;
    }
  } else {
    settings.leadStatuses.push({ name, color, order, type, isDefault });
  }

  // Ensure only one default if setting new default
  if (isDefault) {
    settings.leadStatuses.forEach(s => {
      if (s._id.toString() !== (id || settings.leadStatuses[settings.leadStatuses.length - 1]._id).toString()) {
        if (s.type === (type || 'lead')) s.isDefault = false;
      }
    });
  }

  await settings.save();
  res.ok(settings);
});

// @desc    Reorder Statuses
// @route   PUT /api/settings/statuses/reorder
exports.reorderStatuses = asyncHandler(async (req, res) => {
  const { updates } = req.body; // Array of { id, order }
  const settings = await SystemSettings.findOne({ company_id: req.user.company_id });
  
  if (!settings) return res.fail('Settings not found', 404);

  updates.forEach(u => {
    const status = settings.leadStatuses.id(u.id);
    if (status) status.order = u.order;
  });

  await settings.save();
  res.ok(settings);
});

// @desc    Delete Lead Source
// @route   DELETE /api/settings/sources/:id
exports.deleteLeadSource = asyncHandler(async (req, res) => {
  const settings = await SystemSettings.findOne({ company_id: req.user.company_id });
  if (!settings) return res.fail('Settings not found', 404);

  const source = settings.leadSources.id(req.params.id);
  if (!source) return res.fail('Source not found', 404);

  source.isDeleted = true;
  source.deletedAt = new Date();
  source.deletedBy = req.user.id;

  const TrashEntry = require('../models/TrashEntry');
  await TrashEntry.create({
    entity_type: 'lead-source',
    entity_id: source._id,
    company_id: req.user.company_id,
    title: source.name,
    deleted_by: req.user.id,
    deleted_at: new Date()
  });

  await settings.save();
  res.ok(null, 'Record moved to Trash successfully');
});

// @desc    Delete Lead Status
// @route   DELETE /api/settings/statuses/:id
exports.deleteLeadStatus = asyncHandler(async (req, res) => {
  const settings = await SystemSettings.findOne({ company_id: req.user.company_id });
  if (!settings) return res.fail('Settings not found', 404);

  const status = settings.leadStatuses.id(req.params.id);
  if (!status) return res.fail('Status not found', 404);
  if (status?.isSystem) return res.fail('System statuses cannot be deleted', 400);

  status.isDeleted = true;
  status.deletedAt = new Date();
  status.deletedBy = req.user.id;

  const TrashEntry = require('../models/TrashEntry');
  await TrashEntry.create({
    entity_type: 'lead-status',
    entity_id: status._id,
    company_id: req.user.company_id,
    title: status.name,
    deleted_by: req.user.id,
    deleted_at: new Date()
  });

  await settings.save();
  res.ok(null, 'Record moved to Trash successfully');
});
