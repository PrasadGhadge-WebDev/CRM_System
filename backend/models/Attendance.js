const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['Present', 'Absent', 'Half Day', 'On Leave'], required: true },
  check_in: { type: Date },
  check_out: { type: Date },
  working_hours: { type: Number, default: 0 },
  notes: { type: String }
}, { timestamps: true });

// Ensure one attendance record per employee per day
attendanceSchema.index({ company_id: 1, employee_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
