const mongoose = require('mongoose');
const { withIdTransform } = require('../utils/mongooseTransforms');

const LeadStatusSchema = new mongoose.Schema(
  {
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    color: {
      type: String,
      default: '#60a5fa',
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

withIdTransform(LeadStatusSchema);

module.exports = mongoose.model('LeadStatus', LeadStatusSchema);
