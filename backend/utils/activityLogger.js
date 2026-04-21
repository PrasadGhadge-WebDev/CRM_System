const Activity = require('../models/Activity');

/**
 * Automatically logs a system event as an Activity.
 */
async function logActivity({
  company_id,
  user_id,
  type = 'task',
  description,
  related_to,
  related_type = 'Lead'
}) {
  try {
    return await Activity.create({
      activity_type: type,
      description,
      related_to,
      related_type,
      company_id,
      created_by: user_id,
      status: 'completed',
      activity_date: new Date()
    });
  } catch (error) {
    console.error('Error logging automated activity:', error);
    // Non-blocking, we don't want logs to crash the main request
    return null;
  }
}

module.exports = { logActivity };
