const mongoose = require('mongoose');
const { withIdTransform } = require('../utils/mongooseTransforms');

const NotificationSchema = new mongoose.Schema(
  {
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: false, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, refPath: 'user_id_model', required: true, index: true },
    user_id_model: { type: String, enum: ['User'], default: 'User', index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: { 
      type: String, 
      enum: ['info', 'success', 'warning', 'error', 'lead', 'deal', 'ticket', 'leave', 'follow-up', 'system'], 
      default: 'info' 
    },
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    is_read: { type: Boolean, default: false, index: true },
    read_at: { type: Date },
    is_pinned: { type: Boolean, default: false },
    expiry_time: { type: Date },
    linked_entity_id: { type: mongoose.Schema.Types.ObjectId },
    linked_entity_type: { type: String, enum: ['Lead', 'Customer', 'Deal', 'Activity', 'Note', 'Ticket', 'LeaveRequest'] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

withIdTransform(NotificationSchema);

module.exports = mongoose.model('Notification', NotificationSchema);
