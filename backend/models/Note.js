const mongoose = require('mongoose');
const { withIdTransform } = require('../utils/mongooseTransforms');

const NoteSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Call', 'Email', 'Meeting', 'WhatsApp', 'SMS', 'Other'], default: 'Other' },
    subject: { type: String, trim: true },
    note: { type: String, required: true, trim: true },
    related_to: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    related_type: { type: String, required: true, enum: ['Lead', 'Customer', 'Deal'], index: true },
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, refPath: 'created_by_model' },
    created_by_model: { type: String, enum: ['User'], default: 'User', index: true },
    attachment: { type: String },
    followup_required: { type: Boolean, default: false },
    followup_date: { type: Date },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

withIdTransform(NoteSchema);

module.exports = mongoose.model('Note', NoteSchema);
