const mongoose = require('mongoose');

const candidateApplicationSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  job_id: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPosting', required: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  resume_url: { type: String },
  status: { 
    type: String, 
    enum: ['Applied', 'Screening', 'Interview Scheduled', 'Selected', 'Rejected', 'Hired'], 
    default: 'Applied' 
  },
  interview_date: { type: Date },
  feedback: { type: String },
  handled_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('CandidateApplication', candidateApplicationSchema);
