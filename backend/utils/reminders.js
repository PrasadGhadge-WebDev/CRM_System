const cron = require('node-cron');
const Activity = require('../models/Activity');
const User = require('../models/User');
const { notify } = require('./notifier');
const { sendEmail } = require('./emailService');

/**
 * Sends a daily summary email to all employees with their follow-ups for the day.
 */
const sendDailySummary = async () => {
  console.log('Generating daily follow-up summaries...');
  try {
    const employees = await User.find({ role: 'Employee', status: 'active' });
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(startOfToday.getDate() + 1);

    for (const employee of employees) {
      const todaysActivities = await Activity.find({
        assigned_to: employee._id,
        status: 'planned',
        due_date: { $gte: startOfToday, $lt: endOfToday }
      }).populate('related_to');

      if (todaysActivities.length > 0) {
        const activitiesList = todaysActivities.map(a => 
          `<li><b>${a.activity_type.toUpperCase()}</b>: ${a.description || 'No notes'} at ${new Date(a.due_date).toLocaleTimeString()}</li>`
        ).join('');

        await sendEmail({
          to: employee.email,
          subject: '📅 Your Daily Follow-up Summary',
          html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2>Good Morning, ${employee.name}!</h2>
              <p>You have <b>${todaysActivities.length}</b> follow-ups scheduled for today:</p>
              <ul>${activitiesList}</ul>
              <p>Check your dashboard for full details.</p>
            </div>
          `
        });
      }
    }
  } catch (err) {
    console.error('Daily summary failed:', err);
  }
};

const setupReminders = () => {
  // 1. Run activity reminders every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('Running task reminders check (15m)...');
    try {
      const now = new Date();
      // Look for activities due in the next 75 minutes (to catch the 1-hour window)
      const windowEnd = new Date(now.getTime() + 75 * 60 * 1000); 

      const activities = await Activity.find({
        due_date: { $gte: now, $lte: windowEnd },
        reminder_sent: false,
        reminder_required: true,
        status: 'planned',
      });

      for (const activity of activities) {
        const diffMs = activity.due_date - now;
        const diffMins = Math.round(diffMs / 60000);

        // Notify if it's within the 1-hour (45-75 min) window
        if (diffMins <= 60 && diffMins > 0) {
          if (activity.assigned_to || activity.created_by) {
            const recipientId = activity.assigned_to || activity.created_by;
            await notify({
              user_id: recipientId,
              title: '⏰ Urgent Follow-up Reminder',
              message: `Reminder: Your ${activity.activity_type} is scheduled in ${diffMins} minutes (${new Date(activity.due_date).toLocaleTimeString()}).`,
              type: 'warning',
              linked_entity_id: activity.related_to,
              linked_entity_type: activity.related_type,
              send_email: true,
            });

            activity.reminder_sent = true;
            await activity.save();
          }
        }
      }
    } catch (err) {
      console.error('Reminder check failed:', err);
    }
  });

  // 2. Run Daily Summary at 8:00 AM every day
  cron.schedule('0 8 * * *', () => {
    sendDailySummary();
  });
};

module.exports = setupReminders;
