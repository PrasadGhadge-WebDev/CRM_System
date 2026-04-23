const Notification = require('../models/Notification');
const User = require('../models/User');
const DemoUser = require('../models/DemoUser');
const { sendEmail } = require('./emailService');
const { sendToUser } = require('./socket');

/**
 * Generic notification function (DB + Real-time + Optional Email)
 */
exports.notify = async ({
  user_id,
  user_model,
  title,
  message,
  type = 'info',
  linked_entity_id,
  linked_entity_type,
  send_email = false,
}) => {
  let resolvedModel = user_model === 'DemoUser' ? 'DemoUser' : 'User';
  if (!user_model) {
    const user = await User.findById(user_id).select('_id email');
    if (user) {
      resolvedModel = 'User';
    } else {
      const demoUser = await DemoUser.findById(user_id).select('_id email');
      if (demoUser) {
        resolvedModel = 'DemoUser';
      }
    }
  }

  // 1. Create In-app Notification (DB)
  const notification = await Notification.create({
    user_id,
    user_id_model: resolvedModel,
    title,
    message,
    type,
    linked_entity_id,
    linked_entity_type,
  });

  // 2. Trigger Real-time Socket Event
  sendToUser(user_id, 'notification', {
    id: notification._id,
    title,
    message,
    type,
    linked_entity_id,
    linked_entity_type,
    created_at: notification.created_at,
    is_read: false,
  });

  // 3. Optional Email Notification
  if (send_email) {
    const user = resolvedModel === 'DemoUser'
      ? await DemoUser.findById(user_id)
      : await User.findById(user_id);

    if (user?.email) {
      try {
        await sendEmail({
          to: user.email,
          subject: title,
          text: message,
          html: `<p>${message}</p>`,
        });
      } catch (err) {
        console.error('Failed to send email:', err);
      }
    }
  }

  return notification;
};

/**
 * Notify all users with a specific role in a company
 */
exports.notifyRoleUsers = async ({ company_id, role, title, message, linked_entity_id, linked_entity_type, send_email = false }) => {
  const users = await User.find({ company_id, role, status: 'active' });
  
  const notifications = users.map(user => exports.notify({
    user_id: user.id,
    title,
    message,
    type: 'info',
    linked_entity_id,
    linked_entity_type,
    send_email,
  }));

  // CC secondary admin email if target role is Admin
  if (role === 'Admin' && send_email) {
    notifications.push(sendEmail({
      to: 'prasadghadge748@gmail.com',
      subject: `[Admin CC] ${title}`,
      text: message,
      html: `<p>${message}</p>`,
    }).catch(err => console.error('Secondary Admin CC failed:', err)));
  }

  return Promise.all(notifications);
};

/**
 * Lead Assignment Specific Notification (Email + In-App)
 */
exports.sendLeadAssignmentNotification = async ({ lead, assignee_id, assignee_model, assigner_name }) => {
  const title = 'New Lead Assigned';
  const message = `New Lead Assigned: ${lead.name || 'No Name'}`;
  
  // 1. Trigger DB and Real-time Notification
  await exports.notify({
    user_id: assignee_id,
    user_model: assignee_model || 'User',
    title,
    message,
    type: 'lead_assigned',
    linked_entity_id: lead._id,
    linked_entity_type: 'Lead',
  });

  // 2. Trigger Specialized Email
  try {
    const user = assignee_model === 'DemoUser' 
      ? await DemoUser.findById(assignee_id) 
      : await User.findById(assignee_id);
    
    if (user?.email) {
      await sendEmail({
        to: user.email,
        subject: 'New Lead Assigned to You',
        text: `Hello ${user.name},\n\nA new lead has been assigned to you.\n\nLead Details:\n- Name: ${lead.name}\n- Phone: ${lead.phone || 'N/A'}\n- Source: ${lead.source || 'N/A'}\n- Assigned By: ${assigner_name || 'Admin'}\n\nPlease log in to the CRM and take follow-up action.`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #2563eb;">New Lead Assigned to You</h2>
            <p>Hello <b>${user.name}</b>,</p>
            <p>A new lead has been assigned to you.</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px;">
              <p style="margin: 0;"><b>Lead Details:</b></p>
              <ul style="margin: 10px 0;">
                <li><b>Name:</b> ${lead.name}</li>
                <li><b>Phone:</b> ${lead.phone || 'N/A'}</li>
                <li><b>Source:</b> ${lead.source || 'N/A'}</li>
                <li><b>Assigned By:</b> ${assigner_name || 'Admin'}</li>
              </ul>
            </div>
            <p>Please log in to the CRM and take follow-up action.</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/leads/${lead._id}" 
               style="display: inline-block; background: #2563eb; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
               Open Lead Details
            </a>
          </div>
        `
      });
    }
  } catch (err) {
    console.error('Lead assignment email failed:', err.message);
  }
};

/**
 * Admin Notifications for high-priority events
 */
exports.notifyAdmin = async ({ title, message, data = {} }) => {
  const adminEmails = process.env.CONTACT_EMAIL ? [process.env.CONTACT_EMAIL, 'prasadghadge748@gmail.com'] : ['prasadghadge2212@gmail.com', 'prasadghadge748@gmail.com'];
  const adminPhone = process.env.DEFAULT_ADMIN_PHONE || '9766875355';

  console.log('--- ADMIN NOTIFICATION ---');
  console.log(`Title: ${title}`);
  console.log(`Message: ${message}`);
  console.log('--------------------------');

  try {
    await Promise.all(adminEmails.map(email => sendEmail({
      to: email,
      subject: `[CRM ALERT] ${title}`,
      text: message,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #3b82f6;">System Notification</h2>
          <p><strong>Event:</strong> ${title}</p>
          <p>${message}</p>
          <hr />
          <p style="font-size: 0.9rem; color: #666;">Check your CRM dashboard for more details.</p>
        </div>
      `,
    })));
  } catch (err) {
    console.error('Failed to send admin email:', err.message);
  }

  const hasTwilio = process.env.TWILIO_SID && process.env.TWILIO_TOKEN;
  if (hasTwilio) {
    try {
      const client = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
      await client.messages.create({
        body: `[CRM ALERT] ${title}: ${message}`,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_SENDER || '+14155238886'}`,
        to: `whatsapp:+91${adminPhone}`
      });
      await client.messages.create({
        body: `[CRM ALERT] ${title}: ${message.substring(0, 100)}...`,
        from: process.env.TWILIO_PHONE_NUMBER || '', 
        to: `+91${adminPhone}`
      });
    } catch (err) {
      console.error('Twilio notification failed:', err.message);
    }
  }
};

/**
 * Admin Approval Flow Emails
 */
exports.sendAdminRegistrationEmail = async (user, approvalToken) => {
  const adminEmails = process.env.CONTACT_EMAIL ? [process.env.CONTACT_EMAIL, 'prasadghadge748@gmail.com'] : ['prasadghadge2212@gmail.com', 'prasadghadge748@gmail.com'];
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  const approveUrl = `${baseUrl}/api/admin-actions/approve/${approvalToken}`;
  const rejectUrl = `${baseUrl}/api/admin-actions/reject/${approvalToken}`;

  await Promise.all(adminEmails.map(email => sendEmail({
    to: email,
    subject: `[CRM] New Demo User Registration Request`,
    text: `A new demo user ${user.name} (${user.email}) has registered.\nApprove: ${approveUrl}\nReject: ${rejectUrl}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: #2563eb; color: white; padding: 24px;">
          <h2 style="margin: 0;">Registration Request</h2>
        </div>
        <div style="padding: 24px;">
          <p>Hello Admin, a new user has requested access:</p>
          <ul>
            <li><b>Name:</b> ${user.name}</li>
            <li><b>Email:</b> ${user.email}</li>
            <li><b>Phone:</b> ${user.phone || 'N/A'}</li>
          </ul>
          <div style="margin-top: 24px; display: flex; gap: 10px;">
            <a href="${approveUrl}" style="background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Approve User</a>
            <a href="${rejectUrl}" style="background: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Reject Request</a>
          </div>
        </div>
      </div>
    `,
  })));
};

exports.sendInstantRegistrationAlert = async (user, companyName) => {
  const adminEmails = ['prasadghadge748@gmail.com', 'prasadghadge2212@gmail.com'];
  const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`;
  const timestamp = new Date().toLocaleString();

  await Promise.all(adminEmails.map(email => sendEmail({
    to: email,
    subject: `🚀 [CRM] Instant Demo Access: ${user.name}`,
    text: `A new demo user has registered and gained instant access.\n\n` +
          `User: ${user.name}\n` +
          `Email: ${user.email}\n` +
          `Phone: ${user.phone || 'N/A'}\n` +
          `Company: ${companyName || 'N/A'}\n` +
          `Time: ${timestamp}\n\n` +
          `View dashboard: ${dashboardUrl}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: #2563eb; color: white; padding: 24px; text-align: center;">
          <h2 style="margin: 0; font-size: 24px;">🚀 New Instant Demo Access</h2>
        </div>
        <div style="padding: 32px; color: #1e293b; line-height: 1.6;">
          <p style="font-size: 16px;">Hello Admin, a new demo user has just registered and gained <b>automatic instant access</b> to the system.</p>
          
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0;">
            <h3 style="margin: 0 0 16px 0; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">User Details</h3>
            <div style="margin-bottom: 8px;"><b>Name:</b> ${user.name}</div>
            <div style="margin-bottom: 8px;"><b>Email:</b> ${user.email}</div>
            <div style="margin-bottom: 8px;"><b>Phone:</b> ${user.phone || 'N/A'}</div>
            <div style="margin-bottom: 8px;"><b>Company:</b> ${companyName || 'N/A'}</div>
            <div style="margin-bottom: 0;"><b>Registered At:</b> ${timestamp}</div>
          </div>

          <div style="text-align: center; margin-top: 32px;">
            <a href="${dashboardUrl}" style="background: #2563eb; color: white; height: 48px; border-radius: 8px; padding: 0 32px; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; justify-content: center;">
              Open Admin Dashboard
            </a>
          </div>
        </div>
        <div style="background: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
          This is an automated notification from your CRM system.
        </div>
      </div>
    `,
  })));
};

exports.sendUserApprovalEmail = async (user) => {
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
  await sendEmail({
    to: user.email,
    subject: 'Welcome to Our CRM System',
    text: `Hello ${user.name},\nYour account has been approved. Log in here: ${loginUrl}`,
    html: `
      <div style="font-family: sans-serif; text-align: center; padding: 40px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f172a;">🎉 Account Approved!</h2>
        <p>Hello ${user.name}, your registration request has been approved.</p>
        <a href="${loginUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Login to Dashboard</a>
      </div>
    `,
  });
};

exports.sendUserRejectionEmail = async (user) => {
  await sendEmail({
    to: user.email,
    subject: 'Registration Request Update',
    text: `Hello ${user.name},\nUnfortunately, your registration request was rejected.`,
    html: `<div style="font-family: sans-serif; padding: 20px;"><h2>Registration Update</h2><p>Hello ${user.name}, unfortunately your request was rejected.</p></div>`,
  });
};
