const mongoose = require('mongoose');
const { withIdTransform } = require('../utils/mongooseTransforms');

const FollowupHistorySchema = new mongoose.Schema(
  {
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    contactDate: { type: Date, required: true },
    nextDate: { type: Date, required: true },
    note: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['planned', 'completed', 'cancelled', 'rescheduled'], default: 'planned' },
    followupType: { type: String, enum: ['Call', 'Meeting', 'Email', 'WhatsApp', 'Demo'], default: 'Call' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, refPath: 'assignedToModel', index: true },
    assignedToModel: { type: String, enum: ['User'], default: 'User', index: true },
    priority: { type: String, enum: ['High', 'Medium', 'Low'] },
    statusAfterCall: { type: String, enum: ['Converted', 'Interested', 'Not Interested', 'Call Later', 'Wrong Number', 'Demo Scheduled', 'Negotiation'] },
    reminder: { type: Boolean, default: false },
    reminderTime: { type: String, trim: true },
    reminderOffsets: [{ type: String, enum: ['15m', '1h'] }],
    isDone: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'createdByModel', index: true },
    createdByModel: { type: String, enum: ['User'], default: 'User', index: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } },
);

withIdTransform(FollowupHistorySchema);

module.exports = mongoose.model('FollowupHistory', FollowupHistorySchema);
