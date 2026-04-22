const mongoose = require('mongoose');
const { withIdTransform } = require('../utils/mongooseTransforms');
const softDeletePlugin = require('../utils/softDeletePlugin');

const LeadSchema = new mongoose.Schema(
  {
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
    leadId: { type: String, index: true }, // Format: LD-1001. Removed unique:true to use compound index below
    firstName: { type: String, required: true, trim: true, index: true },
    lastName: { type: String, required: true, trim: true, index: true },
    name: { type: String, required: true, trim: true }, // Combined for display
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    phone: { type: String, trim: true, index: true },
    company: { type: String, trim: true, index: true },
    source: { type: String, required: true, trim: true, index: true }, // Can be name or ID from SystemSettings
    status: { type: String, required: true, trim: true, default: 'new', index: true }, // From SystemSettings
    priority: { type: String, enum: ['Hot', 'Warm', 'Cold'], default: 'Warm', index: true },
    dealAmount: { type: Number, required: true, default: 0 },
    currency: { type: String, default: 'INR' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, refPath: 'assignedToModel', required: true, index: true },
    assignedToModel: { type: String, enum: ['User', 'DemoUser'], default: 'User', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'createdByModel', index: true },
    createdByModel: { type: String, enum: ['User', 'DemoUser'], default: 'User', index: true },
    followUpDate: { type: Date },
    lastContactDate: { type: Date },
    nextFollowupDate: { type: Date },
    followupNote: { type: String, trim: true },
    followupHistory: [{
      date: { type: Date, default: Date.now },
      note: { type: String, trim: true },
      lastContactDate: { type: Date },
      nextFollowupDate: { type: Date },
      status: { type: String, enum: ['planned', 'completed', 'skipped'], default: 'planned' },
      followupType: { type: String, enum: ['Call', 'Meeting', 'Email', 'Task'], default: 'Call' },
      isDone: { type: Boolean, default: false }
    }],
    followupLock: { type: Boolean, default: false }, // For transaction locking
    lastRequestId: { type: String }, // For idempotency
    notes: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    
    // Internal tracking
    convertedCustomerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
    convertedAt: { type: Date },
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);


// Strict Enforcement: Only one planned follow-up per lead
LeadSchema.pre('save', async function() {
  // Only check if followupHistory is modified and we are not deleting
  if (this.isModified('followupHistory') && this.followupHistory && this.followupHistory.length > 0) {
    const plannedCount = this.followupHistory.filter(h => h.status === 'planned').length;
    if (plannedCount > 1) {
      throw new Error('A lead can only have one "planned" follow-up at a time.');
    }
  }
});

LeadSchema.index({ created_at: -1 });
LeadSchema.index({ company_id: 1, leadId: 1 }, { unique: true, background: true });
LeadSchema.index({ company_id: 1, email: 1 }, { unique: true, sparse: true, background: true });
LeadSchema.index({ company_id: 1, phone: 1 }, { unique: true, sparse: true, background: true });

// Virtual for backward compatibility during transition if needed
LeadSchema.virtual('readable_id').get(function() { return this.leadId; });
LeadSchema.set('toObject', { virtuals: true });
LeadSchema.set('toJSON', { virtuals: true });

withIdTransform(LeadSchema);
LeadSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('Lead', LeadSchema);
