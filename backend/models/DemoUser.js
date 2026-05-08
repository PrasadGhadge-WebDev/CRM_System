const mongoose = require('mongoose');

const DemoUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    password: { type: String, required: true },
    company_name: { type: String },
    role: { type: String, default: 'Admin' },
    verification_code: { type: String },
    verification_expires: { type: Date },
    registered_at: { type: Date, default: Date.now },
  },
  { 
    collection: 'demo_users',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
  }
);

// TTL index to auto-delete demo users after 24 hours
DemoUserSchema.index({ created_at: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('DemoUser', DemoUserSchema);

