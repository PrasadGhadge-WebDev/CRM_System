const mongoose = require('mongoose');

const SystemSettingsSchema = new mongoose.Schema(
  {
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', unique: true, index: true },
    leadSources: [
      {
        name: { type: String, required: true, trim: true },
        category: { type: String, enum: ['Paid', 'Organic', 'Referral', 'Direct'], default: 'Direct' },
        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
        deletedAt: { type: Date },
        deletedBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'deletedByModel' },
        deletedByModel: { type: String, enum: ['User'], default: 'User' }
      }
    ],
    leadStatuses: [
      {
        name: { type: String, required: true, trim: true },
        color: { type: String, default: '#3b82f6' },
        order: { type: Number, default: 0 },
        type: { type: String, enum: ['lead', 'customer', 'deal'], default: 'lead' },
        isDefault: { type: Boolean, default: false },
        isSystem: { type: Boolean, default: false },
        isDeleted: { type: Boolean, default: false },
        deletedAt: { type: Date },
        deletedBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'deletedByModel' },
        deletedByModel: { type: String, enum: ['User'], default: 'User' }
      }
    ],
    customerTypes: [
      {
        name: { type: String, required: true, trim: true },
        isActive: { type: Boolean, default: true }
      }
    ],
    customerCategories: [
      {
        name: { type: String, required: true, trim: true },
        isActive: { type: Boolean, default: true }
      }
    ]
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('SystemSettings', SystemSettingsSchema);
