const mongoose = require('mongoose');
const { withIdTransform } = require('../utils/mongooseTransforms');
const softDeletePlugin = require('../utils/softDeletePlugin');

const CustomerSchema = new mongoose.Schema(
  {
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
    customer_id: { type: String, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    company_name: { type: String, trim: true },
    gst_number: { type: String, trim: true },
    total_purchase_amount: { type: Number, default: 0 },
    payment_status: { type: String, enum: ['Paid', 'Pending', 'Overdue'], default: 'Pending' },
    email: { type: String, trim: true, lowercase: true, index: true },
    phone: { type: String, trim: true },
    alternate_phone: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    postal_code: { type: String, trim: true },
    status: { type: String, default: 'Active', index: true },
    assigned_to: { type: mongoose.Schema.Types.ObjectId, refPath: 'assigned_to_model', index: true },
    assigned_to_model: { type: String, enum: ['User', 'DemoUser'], default: 'User', index: true },
    converted_from_lead_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', index: true },
    source: { type: String, trim: true },
    notes: { type: String, trim: true },
    follow_up_date: { type: Date },
    is_vip: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

withIdTransform(CustomerSchema);
CustomerSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('Customer', CustomerSchema);
