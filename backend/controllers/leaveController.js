const LeaveRequest = require('../models/LeaveRequest');
const { asyncHandler } = require('../middleware/asyncHandler');

// @desc    Apply for leave
// @route   POST /api/leaves
// @access  Private
exports.applyLeave = asyncHandler(async (req, res) => {
  const { type, start_date, end_date, reason } = req.body;
  
  const start = new Date(start_date);
  const end = new Date(end_date);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

  const leave = await LeaveRequest.create({
    company_id: req.user.company_id,
    employee_id: req.user._id,
    type,
    start_date,
    end_date,
    days,
    reason,
    status: 'Pending'
  });

  res.status(201).json(leave);
});

// @desc    Get leave requests (Admin/HR gets all, Employee gets own)
// @route   GET /api/leaves
// @access  Private
exports.getLeaves = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const isAdminOrHR = req.user.role === 'Admin' || req.user.role === 'HR' || req.user.role === 'Manager';
  
  const query = { company_id: req.user.company_id };
  if (status) query.status = status;
  if (!isAdminOrHR) {
    query.employee_id = req.user._id;
  }

  const leaves = await LeaveRequest.find(query)
    .populate('employee_id', 'name role department')
    .sort({ createdAt: -1 });

  // Map to match frontend expectations if needed
  const mapped = leaves.map(l => ({
    _id: l._id,
    user_name: l.employee_id?.name || 'Unknown',
    department: l.employee_id?.department || 'N/A',
    type: l.type,
    start_date: l.start_date,
    end_date: l.end_date,
    days: l.days,
    reason: l.reason,
    status: l.status
  }));

  res.ok(mapped);
});

// @desc    Action on leave (Approve/Reject)
// @route   POST /api/leaves/:id/action
// @access  Private (Admin/HR)
exports.actionLeave = asyncHandler(async (req, res) => {
  const { action } = req.body; // approve or reject
  const leave = await LeaveRequest.findById(req.params.id);

  if (!leave) {
    return res.status(404).json({ message: 'Leave request not found' });
  }

  leave.status = action === 'approve' ? 'Approved' : 'Rejected';
  leave.approved_by = req.user._id;
  await leave.save();

  res.ok(leave);
});

// @desc    Cancel leave request
// @route   DELETE /api/leaves/:id
// @access  Private (Owner)
exports.cancelLeave = asyncHandler(async (req, res) => {
  const leave = await LeaveRequest.findById(req.params.id);

  if (!leave) {
    return res.status(404).json({ message: 'Leave request not found' });
  }

  if (leave.employee_id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  if (leave.status !== 'Pending') {
    return res.status(400).json({ message: 'Cannot cancel processed leave' });
  }

  await LeaveRequest.findByIdAndDelete(req.params.id);
  res.ok({ message: 'Leave request cancelled' });
});
