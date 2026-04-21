const mongoose = require('mongoose');
const Activity = require('../models/Activity');
const { asyncHandler } = require('../middleware/asyncHandler');
const { moveDocumentToTrash } = require('../utils/trash');

function buildSearchQuery(q) {
  if (!q) return null;
  const safe = String(q).trim();
  if (!safe) return null;
  return { $regex: safe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
}

exports.listActivities = asyncHandler(async (req, res) => {
  const {
    related_to,
    related_type,
    activity_type,
    q,
    page = 1,
    limit = 20,
    urgency,
    status: statusFilter,
    all
  } = req.query;
  let { sortField, sortOrder } = req.query;
  
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  
  sortField = sortField || 'activity_date';
  sortOrder = sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortField]: sortOrder };

  const filter = {};
  filter.company_id = req.user.company_id;
  const search = buildSearchQuery(q);
  if (related_to && mongoose.Types.ObjectId.isValid(related_to)) {
    filter.related_to = related_to;
  }
  if (related_type) filter.related_type = related_type;
  if (activity_type) filter.activity_type = activity_type;
  if (statusFilter) filter.status = statusFilter;
  if (search) filter.description = search;

  if (urgency) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (urgency === 'overdue') {
      filter.status = 'planned';
      filter.due_date = { $lt: today };
    } else if (urgency === 'today') {
      filter.due_date = { $gte: today, $lt: tomorrow };
    } else if (urgency === 'upcoming') {
      filter.due_date = { $gte: tomorrow };
    }
  }

  const [items, total] = await Promise.all([
    Activity.find(filter)
      .sort(sort)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('related_to')
      .populate('created_by', 'name email')
      .populate('assigned_to', 'name email')
      .populate('completed_by', 'name email'),
    Activity.countDocuments(filter),
  ]);

  res.ok({ items, total, page: pageNum, limit: limitNum });
});

exports.createActivity = asyncHandler(async (req, res) => {
  const activity = await Activity.create({
    ...req.body,
    company_id: req.user.company_id,
    created_by: req.user.id,
  });
  res.created(activity);
});

exports.updateActivity = asyncHandler(async (req, res) => {
  const oldActivity = await Activity.findOne({ _id: req.params.id, company_id: req.user.company_id });
  if (!oldActivity) return res.fail('Activity not found', 404);

  const activity = await Activity.findOneAndUpdate(
    { _id: req.params.id, company_id: req.user.company_id },
    req.body,
    { new: true }
  );

  if (activity && req.body.status === 'completed' && oldActivity.status !== 'completed') {
    const { logActivity } = require('../utils/activityLogger');
    const typeLabel = activity.activity_type.charAt(0).toUpperCase() + activity.activity_type.slice(1);
    await logActivity({
      company_id: req.user.company_id,
      user_id: req.user.id,
      type: activity.activity_type,
      description: `${typeLabel} done`,
      related_to: activity.related_to,
      related_type: activity.related_type
    });
  }

  res.ok(activity);
});

exports.deleteActivity = asyncHandler(async (req, res) => {
  const activity = await Activity.findOne({ _id: req.params.id, company_id: req.user.company_id });
  if (!activity) {
    return res.fail('Activity not found', 404);
  }
  await moveDocumentToTrash({ entityType: 'activity', document: activity, deletedBy: req.user?.id });
  res.ok(null, 'Activity moved to trash');
});
