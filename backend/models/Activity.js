const mongoose = require('mongoose');
const { withIdTransform } = require('../utils/mongooseTransforms');
const softDeletePlugin = require('../utils/softDeletePlugin');

const ActivitySchema = new mongoose.Schema(
  {
    activity_type: { 
      type: String, 
      required: true, 
      enum: ['call', 'meeting', 'email', 'task', 'follow-up', 'Lead Created', 'Deal Created', 'Deal Won', 'Ticket Raised'], 
      index: true 
    },
    description: { type: String, trim: true },
    follow_up_mode: { type: String, enum: ['Call', 'Meeting', 'Email', 'WhatsApp', 'Demo', 'Other'], index: true },
    follow_up_priority: { type: String, enum: ['High', 'Medium', 'Low'], index: true },
    status_after_call: { type: String, enum: ['Converted', 'Not Interested', 'Call Later', 'Wrong Number', 'Demo Scheduled', 'Negotiation'], index: true },
    related_to: { type: mongoose.Schema.Types.ObjectId, required: false, index: true, refPath: 'related_type' },
    related_type: { type: String, required: false, enum: ['Lead', 'Customer', 'Deal', 'SupportTicket'], index: true },
    activity_date: { type: Date, default: Date.now },
    due_date: { type: Date },
    reminder_required: { type: Boolean, default: false },
    reminder_sent: { type: Boolean, default: false },
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, refPath: 'created_by_model' },
    created_by_model: { type: String, enum: ['User', 'DemoUser'], default: 'User', index: true },
    assigned_to: { type: mongoose.Schema.Types.ObjectId, refPath: 'assigned_to_model', index: true },
    assigned_to_model: { type: String, enum: ['User', 'DemoUser'], default: 'User', index: true },
    completed_by: { type: mongoose.Schema.Types.ObjectId, refPath: 'completed_by_model' },
    completed_by_model: { type: String, enum: ['User', 'DemoUser'], default: 'User', index: true },
    status: { type: String, default: 'completed' }, // completed, planned
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

withIdTransform(ActivitySchema);
ActivitySchema.plugin(softDeletePlugin);

module.exports = mongoose.model('Activity', ActivitySchema);
