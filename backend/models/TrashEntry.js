const mongoose = require('mongoose');
const { withIdTransform } = require('../utils/mongooseTransforms');

const trashEntrySchema = new mongoose.Schema(
  {
    entity_type: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    entity_id: {
      type: String,
      required: true,
      trim: true,
    },
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: false,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: '',
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    deleted_by: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'deleted_by_model',
    },
    deleted_by_model: { type: String, enum: ['User', 'DemoUser'], default: 'User', index: true },
    deleted_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  },
);

trashEntrySchema.index({ entity_type: 1, entity_id: 1 }, { unique: true });

withIdTransform(trashEntrySchema);

module.exports = mongoose.model('TrashEntry', trashEntrySchema);
