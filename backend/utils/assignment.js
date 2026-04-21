const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');

/**
 * Finds the next user in a Round Robin sequence for lead assignment.
 * @param {string} companyId - The ID of the company.
 * @returns {Promise<string|null>} - The ID of the selected user, or null if none found.
 */
async function getNextRoundRobinUser(companyId) {
  // 1. Fetch all active employees for assignment first, falling back to managers only if none exist
  let users = await User.find({
    company_id: companyId,
    status: 'active',
    role: 'Employee'
  }).sort({ _id: 1 }); // Sort by ID for consistent sequence

  if (users.length === 0) {
    users = await User.find({
      company_id: companyId,
      status: 'active',
      role: 'Manager'
    }).sort({ _id: 1 });
  }

  if (users.length === 0) return null;

  // 2. Get company's last assigned user
  const company = await Company.findById(companyId);
  const lastUserId = company?.settings?.last_assigned_user_id;

  let nextUserIndex = 0;
  if (lastUserId) {
    const lastIndex = users.findIndex(u => String(u._id) === String(lastUserId));
    if (lastIndex !== -1) {
      nextUserIndex = (lastIndex + 1) % users.length;
    }
  }

  const selectedUser = users[nextUserIndex];

  // 3. Update company state
  await Company.findByIdAndUpdate(companyId, {
    'settings.last_assigned_user_id': selectedUser._id
  });

  return selectedUser._id;
}

module.exports = { getNextRoundRobinUser };
