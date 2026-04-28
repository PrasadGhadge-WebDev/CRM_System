const mongoose = require('mongoose');

const performanceReviewSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reviewer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  review_period: { type: String, required: true }, // e.g., 'Q1 2024' or 'Annual 2024'
  kpi_goals: { type: String, required: true },
  manager_feedback: { type: String },
  rating: { type: Number, min: 1, max: 5 }, // 1-5 stars
  status: { type: String, enum: ['Draft', 'In Progress', 'Completed'], default: 'Draft' },
  recommend_promotion: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('PerformanceReview', performanceReviewSchema);
