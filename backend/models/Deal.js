const mongoose = require('mongoose');
const { withIdTransform } = require('../utils/mongooseTransforms');
const softDeletePlugin = require('../utils/softDeletePlugin');

const DealSchema = new mongoose.Schema(
  {
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
    readable_id: { type: String, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    value: { type: Number, default: 0, min: [0, 'Amount must be a positive number'] },
    currency: { type: String, default: 'INR' },
    
    stage: { 
      type: String, 
      enum: ['Prospecting', 'Qualification', 'Needs Analysis', 'Proposal', 'Negotiation', 'Won', 'Lost'],
      default: 'Prospecting', 
      index: true 
    },
    status: {
      type: String,
      enum: ['Pending', 'Completed', 'Discovery', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'],
      default: 'Pending',
      index: true
    },
    
    expected_close_date: { type: Date, index: true },
    actual_close_date: { type: Date },
    
    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    description: { type: String, trim: true },
    notes: { type: String, trim: true },
    lost_reason: { type: String, trim: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

withIdTransform(DealSchema);
DealSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('Deal', DealSchema);
