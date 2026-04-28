const User = require('../models/User');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const SalarySlip = require('../models/SalarySlip');
const CandidateApplication = require('../models/CandidateApplication');
const { asyncHandler } = require('../middleware/asyncHandler');

exports.getHRDashboard = asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const currentMonth = new Date().getMonth() + 1; // 1-12
  const currentYear = new Date().getFullYear();

  const [
    employeesByRole,
    todayAttendance,
    totalEmployees,
    pendingLeaves,
    payrollSummary,
    upcomingInterviews,
    allEmployees
  ] = await Promise.all([
    // Total employees count (role-wise)
    User.aggregate([
      { $match: { company_id: companyId } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]),
    // Today's attendance
    Attendance.aggregate([
      { $match: { company_id: companyId, date: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    // Total employees
    User.countDocuments({ company_id: companyId }),
    // Pending leave requests
    LeaveRequest.countDocuments({ company_id: companyId, status: 'Pending' }),
    // This month's payroll summary
    SalarySlip.aggregate([
      { $match: { company_id: companyId, month: currentMonth, year: currentYear } },
      { $group: { _id: null, totalNet: { $sum: '$net_salary' }, processed: { $sum: 1 } } }
    ]),
    // Upcoming interviews
    CandidateApplication.find({
      company_id: companyId,
      status: 'Interview Scheduled',
      interview_date: { $gte: todayStart }
    }).populate('job_id', 'title').sort({ interview_date: 1 }).limit(5),
    // All employees for birthdays/anniversaries
    User.find({ company_id: companyId }).select('name date_of_birth joining_date')
  ]);

  // Calculate birthdays and anniversaries for current month
  const reminders = [];
  allEmployees.forEach(emp => {
    if (emp.date_of_birth) {
      const dob = new Date(emp.date_of_birth);
      if (dob.getMonth() + 1 === currentMonth) {
        reminders.push({ type: 'Birthday', name: emp.name, date: dob.getDate() });
      }
    }
    if (emp.joining_date) {
      const join = new Date(emp.joining_date);
      if (join.getMonth() + 1 === currentMonth && join.getFullYear() < currentYear) {
        reminders.push({ type: 'Work Anniversary', name: emp.name, date: join.getDate() });
      }
    }
  });

  // Sort reminders by date
  reminders.sort((a, b) => a.date - b.date);

  const presentCount = todayAttendance.find(a => a._id === 'Present' || a._id === 'Half Day')?.count || 0;
  const absentCount = todayAttendance.find(a => a._id === 'Absent')?.count || 0;
  const onLeaveCount = todayAttendance.find(a => a._id === 'On Leave')?.count || 0;

  // Since attendance might not be fully marked, calculate un-marked as absent
  const markedTotal = todayAttendance.reduce((sum, a) => sum + a.count, 0);
  const unmarkedAbsent = Math.max(0, totalEmployees - markedTotal);

  res.ok({
    employeesByRole: employeesByRole.map(e => ({ role: e._id, count: e.count })),
    attendance: {
      present: presentCount,
      absent: absentCount + unmarkedAbsent,
      onLeave: onLeaveCount,
      total: totalEmployees
    },
    pendingLeaves,
    payrollSummary: payrollSummary[0] || { totalNet: 0, processed: 0 },
    upcomingInterviews,
    reminders
  });
});
