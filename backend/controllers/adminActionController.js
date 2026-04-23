const DemoUser = require('../models/DemoUser');
const { asyncHandler } = require('../middleware/asyncHandler');
const notifier = require('../utils/notifier');
const logger = require('../utils/logger');

// @desc    Approve a demo user
// @route   GET /api/admin-actions/approve/:token
// @access  Public (via secure token)
exports.approveUser = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const user = await DemoUser.findOne({
    approval_token: token,
    approval_token_expires: { $gt: Date.now() },
  }).select('+approval_token +approval_token_expires');

  if (!user) {
    return res.status(400).send(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #ef4444;">Invalid or Expired Link</h1>
        <p>This approval link is no longer valid or has expired.</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="color: #3b82f6;">Go to Website</a>
      </div>
    `);
  }

  user.status = 'active';
  user.approval_token = undefined;
  user.approval_token_expires = undefined;
  await user.save();

  // Send Welcome Email
  try {
    await notifier.sendUserApprovalEmail(user);
  } catch (err) {
    logger.error('Failed to send approval email:', err.message);
  }

  res.status(200).send(`
    <div style="font-family: sans-serif; text-align: center; padding: 50px;">
      <h1 style="color: #10b981;">User Approved Successfully</h1>
      <p>User <strong>${user.name}</strong> (${user.email}) is now active.</p>
      <p>A welcome email has been sent to them.</p>
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="color: #3b82f6;">Go to Admin Login</a>
    </div>
  `);
});

// @desc    Reject a demo user
// @route   GET /api/admin-actions/reject/:token
// @access  Public (via secure token)
exports.rejectUser = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const user = await DemoUser.findOne({
    approval_token: token,
  }).select('+approval_token');

  if (!user) {
    return res.status(400).send(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #ef4444;">Invalid Link</h1>
        <p>This rejection link is no longer valid.</p>
      </div>
    `);
  }

  user.status = 'rejected';
  user.approval_token = undefined;
  user.approval_token_expires = undefined;
  await user.save();

  // Send Rejection Email
  try {
    await notifier.sendUserRejectionEmail(user);
  } catch (err) {
    logger.error('Failed to send rejection email:', err.message);
  }

  res.status(200).send(`
    <div style="font-family: sans-serif; text-align: center; padding: 50px;">
      <h1 style="color: #f59e0b;">User Rejected</h1>
      <p>The registration request for <strong>${user.name}</strong> has been rejected.</p>
      <p>The user has been notified.</p>
    </div>
  `);
});
