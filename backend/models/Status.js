const mongoose = require('mongoose');
const { withIdTransform } = require('../utils/mongooseTransforms');

const statusSchema = new mongoose.Schema(
  {
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Status name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['lead', 'customer', 'deal'],
      required: true,
      index: true,
    },
    color: {
      type: String,
      default: '#3b82f6', // Default blue
    },
    order: {
      type: Number,
      default: 0,
    },
    is_default: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

statusSchema.index({ company_id: 1, type: 1, name: 1 }, { unique: true });

withIdTransform(statusSchema);

module.exports = mongoose.model('Status', statusSchema);
