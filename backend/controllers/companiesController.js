const Company = require('../models/Company');
const { asyncHandler } = require('../middleware/asyncHandler');
const { moveDocumentToTrash } = require('../utils/trash');

function buildSearchQuery(q) {
  if (!q) return null;
  const safe = String(q).trim();
  if (!safe) return null;
  return { $regex: safe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
}

exports.listCompanies = asyncHandler(async (req, res) => {
  const { q, status, page = 1, limit = 20, sortField = 'created_at', sortOrder = 'desc' } = req.query;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const sort = { [sortField]: sortOrder === 'desc' ? -1 : 1 };

  const search = buildSearchQuery(q);
  const filter = {};
  if (status) filter.status = String(status).trim();
  if (search) {
    filter.$or = [
      { company_name: search },
      { email: search },
      { phone: search },
      { tax_number: search },
    ];
  }

  const [items, total] = await Promise.all([
    Company.find(filter)
      .sort(sort)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Company.countDocuments(filter),
  ]);

  res.ok({ items, page: pageNum, limit: limitNum, total });
});

exports.createCompany = asyncHandler(async (req, res) => {
  const created = await Company.create(req.body || {});
  res.created(created);
});

exports.getCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    return res.fail('Company not found', 404);
  }
  res.ok(company);
});

exports.updateCompany = asyncHandler(async (req, res) => {
  const updated = await Company.findByIdAndUpdate(req.params.id, req.body || {}, {
    new: true,
    runValidators: true,
  });
  if (!updated) {
    return res.fail('Company not found', 404);
  }
  res.ok(updated);
});

exports.deleteCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    return res.fail('Company not found', 404);
  }
  await moveDocumentToTrash({ entityType: 'company', document: company, deletedBy: req.user?.id });
  res.ok(null, 'Company moved to trash');
});
