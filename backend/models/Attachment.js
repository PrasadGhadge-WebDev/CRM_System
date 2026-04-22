const mongoose = require('mongoose');
const { withIdTransform } = require('../utils/mongooseTransforms');

const AttachmentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    original_name: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true },
    related_to: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    related_type: { type: String, required: true, enum: ['Lead', 'Customer', 'Deal'], index: true },
    uploaded_by: { type: mongoose.Schema.Types.ObjectId, refPath: 'uploaded_by_model' },
    uploaded_by_model: { type: String, enum: ['User', 'DemoUser'], default: 'User', index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

withIdTransform(AttachmentSchema);

module.exports = mongoose.model('Attachment', AttachmentSchema);
