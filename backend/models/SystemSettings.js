const mongoose = require('mongoose');

const SystemSettingsSchema = new mongoose.Schema(
  {
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
    companyName: { type: String, default: 'My CRM' },
    defaultCurrency: { type: String, default: 'INR' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    itemsPerPage: { type: Number, default: 10 },
    enableEmailNotifications: { type: Boolean, default: true },
    defaultLeadStatus: { type: String, default: 'New' },

    leadSources: [
      {
        name: { type: String, required: true, trim: true },
        category: { type: String, enum: ['Paid', 'Organic', 'Referral', 'Direct', 'Social', 'Other'], default: 'Direct' },
        isActive: { type: Boolean, default: true },
        order: { type: Number, default: 0 },
        color: { type: String, default: '#3b82f6' },
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
