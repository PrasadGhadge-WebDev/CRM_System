const mongoose = require('mongoose');
const { withIdTransform } = require('../utils/mongooseTransforms');
const softDeletePlugin = require('../utils/softDeletePlugin');

const DealSchema = new mongoose.Schema(
  {
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
    readable_id: { type: String, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    value: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    status: { 
      type: String, 
      default: 'New', 
      index: true 
    },
    expected_close_date: { type: Date, index: true },
    assigned_to: { type: mongoose.Schema.Types.ObjectId, refPath: 'assigned_to_model', index: true },
    assigned_to_model: { type: String, enum: ['User', 'DemoUser'], default: 'User', index: true },
    description: { type: String, trim: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

withIdTransform(DealSchema);
DealSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('Deal', DealSchema);
