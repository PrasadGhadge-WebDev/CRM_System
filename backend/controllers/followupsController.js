const mongoose = require('mongoose');
const { asyncHandler } = require('../middleware/asyncHandler');
const Lead = require('../models/Lead');
const FollowupHistory = require('../models/FollowupHistory');
const Activity = require('../models/Activity');

exports.createFollowup = asyncHandler(async (req, res) => {
  const { 
    leadId, 
    lastContactDate, 
    nextFollowupDate, 
    note,
    status,
    followupType,
    reminder,
    reminderTime,
    isDone
  } = req.body || {};

  if (!leadId || !mongoose.Types.ObjectId.isValid(leadId)) {
    return res.fail('Valid leadId is required', 400);
  }
  if (!nextFollowupDate) {
    return res.fail('Next follow-up date is required', 400);
  }

  const contactDate = lastContactDate ? new Date(lastContactDate) : new Date();
  
  // Combine date and time (if reminderTime exists)
  let nextDate = new Date(nextFollowupDate);
  if (reminderTime && reminderTime.includes(':')) {
    const [hours, minutes] = reminderTime.split(':');
    nextDate.setHours(parseInt(hours, 10));
    nextDate.setMinutes(parseInt(minutes, 10));
    nextDate.setSeconds(0);
    nextDate.setMilliseconds(0);
  } else {
    // default to 10 AM if no time provided but date is there
    nextDate.setHours(10, 0, 0, 0); 
  }

  if (Number.isNaN(contactDate.getTime())) {
    return res.fail('Invalid lastContactDate', 400);
  }
  if (Number.isNaN(nextDate.getTime())) {
    return res.fail('Invalid nextFollowupDate', 400);
  }
  
  // Validate next date isn't strictly in the past day
  const todayStart = new Date();
  todayStart.setHours(0,0,0,0);
  
  if (new Date(nextFollowupDate).getTime() < todayStart.getTime()) {
    return res.fail('Next follow-up date cannot be in the past', 400);
  }

  const lead = await Lead.findOne({ _id: leadId, company_id: req.user.company_id });
  if (!lead) {
    return res.fail('Lead not found', 404);
  }

  const updatedLead = await Lead.findOneAndUpdate(
    { _id: leadId, company_id: req.user.company_id },
    {
      lastContactDate: contactDate,
      nextFollowupDate: nextDate,
      followupNote: note || '',
      status: status || lead.status, // Update lead status if provided
      $push: {
        followupHistory: {
          date: new Date(),
          note: note || '',
          lastContactDate: contactDate,
          nextFollowupDate: nextDate,
          status,
          followupType,
          isDone: !!isDone
        },
      },
    },
    { new: true },
  );

  const followup = await FollowupHistory.create({
    company_id: req.user.company_id,
    leadId,
    contactDate,
    nextDate,
    note: note || '',
    status,
    followupType,
    reminder: !!reminder,
    reminderTime,
    isDone: !!isDone,
    createdBy: req.user._id,
  });

  // Create an Activity for notifications / reminders
  const validModes = ['Call', 'Meeting', 'Email', 'WhatsApp'];
  const resolvedFollowupMode = validModes.includes(followupType) ? followupType : 'Other';

  await Activity.create({
      activity_type: 'follow-up',
      description: note || `Follow-up for ${updatedLead.name}`,
      follow_up_mode: resolvedFollowupMode,
      related_to: leadId,
      related_type: 'Lead',
      due_date: nextDate,
      reminder_required: !!reminder,
      company_id: req.user.company_id,
      created_by: req.user._id,
      assigned_to: lead.assignedTo || req.user._id,
      status: isDone ? 'completed' : 'planned'
  });

  return res.created({ lead: updatedLead, followup }, 'Follow-up saved successfully');
});

