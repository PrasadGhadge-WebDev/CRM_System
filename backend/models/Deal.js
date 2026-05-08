const mongoose = require('mongoose');
const { withIdTransform } = require('../utils/mongooseTransforms');
const softDeletePlugin = require('../utils/softDeletePlugin');

const DealSchema = new mongoose.Schema(
  {
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
    readable_id: { type: String, index: true },
    name: { type: String, required: true, trim: true },
    value: { type: Number, default: 0, min: [0, 'Amount must be a positive number'] },
    currency: { type: String, default: 'INR' },
    
    stage: { 
      type: String, 
      enum: ['Prospecting', 'New', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost'],
      default: 'New', 
      index: true 
    },
    status: {
      type: String,
      enum: ['Open', 'Closed', 'Pending', 'Completed'],
      default: 'Open',
      index: true
    },
    
    expected_close_date: { type: Date, index: true },
    actual_close_date: { type: Date },
    next_followup_date: { type: Date, index: true },
    
    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    // Business Info
    product_service: { type: String, trim: true },
    quantity: { type: Number, default: 1 },
    price: { type: Number, default: 0 },
    discount_percent: { type: Number, default: 0 },
    discount: { type: Number, default: 0 }, // Fixed discount amount
    
    description: { type: String, trim: true },
    notes: { type: String, trim: true },
    lost_reason: { type: String, trim: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

DealSchema.index({ company_id: 1, readable_id: 1 }, { unique: true });

withIdTransform(DealSchema);
DealSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('Deal', DealSchema);
