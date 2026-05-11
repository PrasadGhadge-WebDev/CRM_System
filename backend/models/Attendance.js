const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['Present', 'Absent', 'Half Day', 'On Leave', 'Work From Home'], required: true },
  check_in: { type: Date },
  check_out: { type: Date },
  working_hours: { type: Number, default: 0 },
  late_mark: { type: Boolean, default: false },
  overtime_hours: { type: Number, default: 0 },
  location_info: {
    office: String,
    ip_address: String,
    gps_coordinates: String
  },
  notes: { type: String },
  correction_requested: { type: Boolean, default: false },
  correction_note: { type: String }
}, { timestamps: true });

// Ensure one attendance record per employee per day
attendanceSchema.index({ company_id: 1, employee_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
