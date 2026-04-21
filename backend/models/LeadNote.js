const mongoose = require('mongoose');
const { withIdTransform } = require('../utils/mongooseTransforms');

const LeadNoteSchema = new mongoose.Schema(
  {
    lead_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
    note: { type: String, required: true, trim: true },
    created_at: { type: Date, default: Date.now, immutable: true },
  },
  { timestamps: false },
);

withIdTransform(LeadNoteSchema);

module.exports = mongoose.model('LeadNote', LeadNoteSchema);

