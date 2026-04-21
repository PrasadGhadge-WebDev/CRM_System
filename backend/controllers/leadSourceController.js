const LeadSource = require('../models/LeadSource');
const Lead = require('../models/Lead');
const { asyncHandler } = require('../middleware/asyncHandler');

// @desc    Get lead sources
// @route   GET /api/lead-sources
exports.getLeadSources = asyncHandler(async (req, res) => {
  const sources = await LeadSource.find({ company_id: req.user.company_id }).sort({ name: 1 });
  
  // Optionally enrich with lead counts
  const enriched = await Promise.all(sources.map(async (s) => {
    const count = await Lead.countDocuments({ company_id: req.user.company_id, source: s.name });
    return { ...s.toJSON(), leads_count: count };
  }));

  res.ok(enriched);
});

// @desc    Upsert lead source
// @route   POST /api/lead-sources
exports.upsertLeadSource = asyncHandler(async (req, res) => {
  const { id, name, category, cost_per_lead, is_default, status } = req.body;

  if (is_default) {
    // Reset other defaults
    await LeadSource.updateMany(
      { company_id: req.user.company_id },
      { is_default: false }
    );
  }

  let doc;
  if (id) {
    doc = await LeadSource.findByIdAndUpdate(
      id,
      { name, category, cost_per_lead, is_default, status },
      { new: true, runValidators: false }
    );
  } else {
    doc = await LeadSource.create({
      company_id: req.user.company_id,
      name,
      category,
      cost_per_lead: cost_per_lead || 0,
      is_default: !!is_default,
      status: status || 'active'
    });
  }

  res.ok(doc, id ? 'Source updated' : 'Source created');
});

// @desc    Delete lead source
// @route   DELETE /api/lead-sources/:id
exports.deleteLeadSource = asyncHandler(async (req, res) => {
  const doc = await LeadSource.findById(req.params.id);

  if (!doc) {
    return res.fail('Source not found', 404);
  }

  // Check if used
  const usedCount = await Lead.countDocuments({ company_id: req.user.company_id, source: doc.name });

  if (usedCount > 0) {
    return res.fail(`Cannot delete: ${usedCount} leads are currently using this source.`, 400);
  }

  await doc.deleteOne();
  res.ok(null, 'Source deleted');
});
