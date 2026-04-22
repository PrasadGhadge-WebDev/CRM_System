const mongoose = require('mongoose');
const { withIdTransform } = require('../utils/mongooseTransforms');

const NoteSchema = new mongoose.Schema(
  {
    note: { type: String, required: true, trim: true },
    related_to: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    related_type: { type: String, required: true, enum: ['Lead', 'Customer', 'Deal'], index: true },
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, refPath: 'created_by_model' },
    created_by_model: { type: String, enum: ['User', 'DemoUser'], default: 'User', index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

withIdTransform(NoteSchema);

module.exports = mongoose.model('Note', NoteSchema);
