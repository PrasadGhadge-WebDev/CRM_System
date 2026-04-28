const mongoose = require('mongoose');
const { withIdTransform } = require('../utils/mongooseTransforms');

const CompanySchema = new mongoose.Schema(
  {
    company_name: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true, index: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    website: { type: String, trim: true },
    tax_number: { type: String, trim: true },
    logo: { type: String, trim: true },
    status: { type: String, trim: true, default: 'active', index: true },
    settings: {
      currency: { type: String, default: 'USD' },
      timezone: { type: String, default: 'UTC' },
      fiscal_year_start: { type: String, default: 'January' },
      last_assigned_user_id: { type: mongoose.Schema.Types.ObjectId, refPath: 'settings.last_assigned_user_id_model' },
      last_assigned_user_id_model: { type: String, enum: ['User'], default: 'User', index: true },
      smtp: {
        host: { type: String, trim: true },
        port: { type: String, trim: true },
        user: { type: String, trim: true },
        password: { type: String, trim: true },
      },
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

withIdTransform(CompanySchema);

module.exports = mongoose.model('Company', CompanySchema);
