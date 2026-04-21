const mongoose = require('mongoose');
const { withIdTransform } = require('../utils/mongooseTransforms');

const LeadSourceSchema = new mongoose.Schema(
  {
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
    name: { type: String, required: true, trim: true },
    category: { 
      type: String, 
      enum: ['Paid', 'Organic', 'Referral', 'Direct'], 
      default: 'Direct' 
    },
    cost_per_lead: { type: Number, default: 0 },
    is_default: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

LeadSourceSchema.index({ company_id: 1, name: 1 }, { unique: true });

withIdTransform(LeadSourceSchema);

module.exports = mongoose.model('LeadSource', LeadSourceSchema);
