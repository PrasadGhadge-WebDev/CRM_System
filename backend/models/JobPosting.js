const mongoose = require('mongoose');

const jobPostingSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  title: { type: String, required: true },
  department: { type: String, required: true },
  location: { type: String },
  type: { type: String, enum: ['Full-time', 'Part-time', 'Contract', 'Internship'], default: 'Full-time' },
  description: { type: String, required: true },
  requirements: { type: String },
  status: { type: String, enum: ['Open', 'Closed', 'Draft'], default: 'Open' },
  posted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('JobPosting', jobPostingSchema);
