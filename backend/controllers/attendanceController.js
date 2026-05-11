const Attendance = require('../models/Attendance');
const User = require('../models/User');
const mongoose = require('mongoose');

// @desc    Check-in for today
// @route   POST /api/attendance/check-in
// @access  Private
exports.checkIn = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Check if record already exists
    let attendance = await Attendance.findOne({
      employee_id: req.user._id,
      date: today
    });

    if (attendance && attendance.check_in) {
      return res.status(400).json({ message: 'Already checked in for today' });
    }

    // Determine status (Late if after 9:30 AM)
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const isLate = hours > 9 || (hours === 9 && minutes > 30);
    const status = 'Present'; // Keep status as Present, use late_mark for flagging
    const late_mark = isLate;

    if (attendance) {
      attendance.check_in = now;
      attendance.status = status;
      attendance.late_mark = late_mark;
      attendance.location_info = {
        ip_address: req.ip,
        office: 'Main Office'
      };
      await attendance.save();
    } else {
      attendance = await Attendance.create({
        company_id: req.user.company_id,
        employee_id: req.user._id,
        date: today,
        check_in: now,
        status: status,
        late_mark: late_mark,
        location_info: {
          ip_address: req.ip,
          office: 'Main Office'
        }
      });
    }

    res.status(200).json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Check-out for today
// @route   POST /api/attendance/check-out
// @access  Private
exports.checkOut = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const attendance = await Attendance.findOne({
      employee_id: req.user._id,
      date: today
    });

    if (!attendance || !attendance.check_in) {
      return res.status(400).json({ message: 'No check-in record found for today' });
    }

    if (attendance.check_out) {
      return res.status(400).json({ message: 'Already checked out for today' });
    }

    attendance.check_out = now;
    
    // Calculate working hours
    const durationMs = attendance.check_out - attendance.check_in;
    const hoursWorked = parseFloat((durationMs / (1000 * 60 * 60)).toFixed(2));
    attendance.working_hours = hoursWorked;

    // Overtime calculation (Hours > 9)
    if (hoursWorked > 9) {
      attendance.overtime_hours = parseFloat((hoursWorked - 9).toFixed(2));
    }

    await attendance.save();
    res.status(200).json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get today's attendance status
// @route   GET /api/attendance/today
// @access  Private
exports.getTodayStatus = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const attendance = await Attendance.findOne({
      employee_id: req.user._id,
      date: today
    });

    res.status(200).json(attendance || { status: 'Not Checked In' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get monthly attendance report for admin
// @route   GET /api/attendance/report
// @access  Private (Admin/Manager/HR)
exports.getAttendanceReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    const m = parseInt(month) || new Date().getMonth() + 1;
    
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);

    const attendanceRecords = await Attendance.find({
      company_id: req.user.company_id,
      date: { $gte: start, $lte: end }
    }).populate('employee_id', 'name role email');

    // Group by employee for easier reporting
    const report = {};
    attendanceRecords.forEach(record => {
      if (!record.employee_id) return;
      const empId = record.employee_id._id.toString();
      if (!report[empId]) {
        report[empId] = {
          employee: record.employee_id,
          records: [],
          stats: {
            Present: 0,
            Late: 0,
            Absent: 0,
            'Half Day': 0,
            'On Leave': 0,
            totalHours: 0
          }
        };
      }
      report[empId].records.push(record);
      if (report[empId].stats[record.status] !== undefined) {
        report[empId].stats[record.status]++;
      }
      report[empId].stats.totalHours += record.working_hours || 0;
    });

    res.status(200).json(Object.values(report));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get my personal attendance history
// @route   GET /api/attendance/my-history
// @access  Private
exports.getMyAttendance = async (req, res) => {
  try {
    const { month, year } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    const m = parseInt(month) || new Date().getMonth() + 1;
    
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);

    const records = await Attendance.find({
      employee_id: req.user._id,
      date: { $gte: start, $lte: end }
    }).sort({ date: -1 });

    const stats = {
      present: records.filter(r => r.status === 'Present').length,
      absent: records.filter(r => r.status === 'Absent').length,
      half_day: records.filter(r => r.status === 'Half Day').length,
      leaves: records.filter(r => r.status === 'On Leave').length,
      late: records.filter(r => r.late_mark).length,
      overtime: records.reduce((sum, r) => sum + (r.overtime_hours || 0), 0)
    };

    res.status(200).json({ records, stats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

