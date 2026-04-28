const { moveDocumentToTrash } = require('../utils/trash');
const { asyncHandler } = require('../middleware/asyncHandler');
const Note = require('../models/Note');

exports.listNotes = asyncHandler(async (req, res) => {
  const { related_to, related_type, page = 1, limit = 20 } = req.query;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));

  const filter = {};
  if (related_to) filter.related_to = related_to;
  if (related_type) filter.related_type = related_type;

  const [items, total] = await Promise.all([
    Note.find(filter)
      .sort({ created_at: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('created_by', 'name email'),
    Note.countDocuments(filter),
  ]);

  res.ok({ items, total, page: pageNum, limit: limitNum });
});

exports.createNote = asyncHandler(async (req, res) => {
  const note = await Note.create({
    ...req.body,
    created_by: req.user.id,
  });
  res.created(note);
});

exports.deleteNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) {
    return res.fail('Note not found', 404);
  }
  await moveDocumentToTrash({ entityType: 'note', document: note, deletedBy: req.user?.id });
  res.ok(null, 'Note moved to trash');
});
