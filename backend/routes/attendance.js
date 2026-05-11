const express = require('express');
const router = express.Router();
const { 
  checkIn, 
  checkOut, 
  getTodayStatus, 
  getAttendanceReport,
  getMyAttendance
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/today', getTodayStatus);
router.get('/my-history', getMyAttendance);

// Admin/HR access for reports
router.get('/report', authorize('Admin', 'HR', 'Manager'), getAttendanceReport);

module.exports = router;
