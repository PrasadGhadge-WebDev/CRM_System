const mongoose = require('mongoose');

const salarySlipSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  month: { type: Number, required: true }, // 1-12
  year: { type: Number, required: true },
  basic_salary: { type: Number, required: true },
  allowances: { type: Number, default: 0 }, // bonuses, incentives
  deductions: { type: Number, default: 0 }, // tax, leave without pay
  net_salary: { type: Number, required: true },
  status: { type: String, enum: ['Draft', 'Processed', 'Paid'], default: 'Draft' },
  payment_date: { type: Date }
}, { timestamps: true });

// Ensure one slip per employee per month
salarySlipSchema.index({ company_id: 1, employee_id: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('SalarySlip', salarySlipSchema);
