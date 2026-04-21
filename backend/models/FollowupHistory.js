const mongoose = require('mongoose');
const { withIdTransform } = require('../utils/mongooseTransforms');

const FollowupHistorySchema = new mongoose.Schema(
  {
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    contactDate: { type: Date, required: true },
    nextDate: { type: Date, required: true },
    note: { type: String, trim: true, default: '' },
    status: { type: String, trim: true },
    followupType: { type: String, trim: true },
    reminder: { type: Boolean, default: false },
    reminderTime: { type: String, trim: true },
    isDone: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } },
);

withIdTransform(FollowupHistorySchema);

module.exports = mongoose.model('FollowupHistory', FollowupHistorySchema);

