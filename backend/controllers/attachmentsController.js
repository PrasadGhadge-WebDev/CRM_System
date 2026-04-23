const Attachment = require('../models/Attachment');
const { moveDocumentToTrash } = require('../utils/trash');
const { asyncHandler } = require('../middleware/asyncHandler');
const fs = require('fs');
const path = require('path');

exports.uploadAttachment = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.fail('No file uploaded', 400);
  }

  const attachment = await Attachment.create({
    filename: req.file.filename,
    original_name: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    path: req.file.path,
    related_to: req.body.related_to,
    related_type: req.body.related_type,
    uploaded_by: req.user.id,
  });

  res.created(attachment);
});

exports.listAttachments = asyncHandler(async (req, res) => {
  const { related_to, related_type } = req.query;
  const filter = {};
  if (related_to) filter.related_to = related_to;
  if (related_type) filter.related_type = related_type;

  const attachments = await Attachment.find(filter).sort({ created_at: -1 });
  res.ok(attachments);
});

exports.deleteAttachment = asyncHandler(async (req, res) => {
  const attachment = await Attachment.findById(req.params.id);
  if (!attachment) {
    return res.fail('Attachment not found', 404);
  }

  // Note: File is kept on disk for potential restore
  await moveDocumentToTrash({ entityType: 'attachment', document: attachment, deletedBy: req.user?.id });
  res.ok(null, 'Attachment moved to trash');
});
