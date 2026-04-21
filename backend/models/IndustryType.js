const mongoose = require('mongoose');
const { withIdTransform } = require('../utils/mongooseTransforms');

const IndustryTypeSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    color: {
      type: String,
      default: '#3b82f6',
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

withIdTransform(IndustryTypeSchema);

module.exports = mongoose.model('IndustryType', IndustryTypeSchema);
