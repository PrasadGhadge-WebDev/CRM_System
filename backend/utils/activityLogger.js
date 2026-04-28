const Activity = require('../models/Activity');

/**
 * Automatically logs a system event as an Activity.
 */
async function logActivity({
  company_id,
  user_id,
  user_model = 'User',
  type = 'task',
  description,
  related_to,
  related_type = 'Lead',
  category = 'system',
  color_code = 'gray'
}) {
  try {
    const activity = await Activity.create({
      activity_type: type,
      description,
      related_to,
      related_type,
      company_id,
      created_by: user_id,
      created_by_model: user_model,
      category,
      color_code,
      status: 'completed',
      activity_date: new Date()
    });

    const { broadcastToCompany } = require('./socket');
    broadcastToCompany(company_id, 'NEW_ACTIVITY', {
      activity,
      related_to,
      related_type
    });

    return activity;
  } catch (error) {
    console.error('Error logging automated activity:', error);
    return null;
  }
}

module.exports = { logActivity };
