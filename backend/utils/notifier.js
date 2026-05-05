const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendToUser } = require('./socket');
const emailQueue = require('./emailQueue');

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
  const resolvedModel = 'User';

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

  // 2. Trigger Real-time Socket Event (Systematic In-app Notification)
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

  // 3. Optional Email Notification via Queue
  if (send_email) {
    const user = await User.findById(user_id).select('email name');

    if (user?.email) {
      emailQueue.add({
        to: user.email,
        subject: title,
        text: message,
        html: `<p>${message}</p>`,
      });
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
    emailQueue.add({
      to: 'prasadghadge748@gmail.com',
      subject: `[Admin CC] ${title}`,
      text: message,
      html: `<p>${message}</p>`,
    });
  }

  return Promise.all(notifications);
};

/**
 * Lead Assignment Specific Notification (Email + In-App)
 */
exports.sendLeadAssignmentNotification = async ({ lead, assignee_id, assignee_model, assigner_name, attachments = [] }) => {
  const title = 'New Lead Assigned';
  const message = `New Lead Assigned: ${lead.name || 'No Name'}`;
  
  // Dynamic steps based on status
  const statusSteps = {
    'New': [
      'Call within 24 hours to establish first contact',
      'Understand their core requirements and pain points',
      'Update the follow-up date in the CRM for next steps'
    ],
    'Contacted': [
      'Send a personalized proposal based on the initial discussion',
      'Schedule a follow-up call after 2 days to discuss the proposal',
      'Move status to "Qualified" if they show continued interest'
    ],
    'Negotiation': [
      'Discuss final pricing and terms of engagement',
      'Address any final objections or technical hurdles',
      'Get a clear commitment or signed contract'
    ],
    'Default': [
      'Review lead history and previous notes',
      'Perform discovery call to qualify the prospect',
      'Set next follow-up action in the CRM'
    ]
  };

  const steps = statusSteps[lead.status] || statusSteps['Default'];
  
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

  // 2. Trigger Specialized Email via Queue (with attachment support)
  try {
    const user = await User.findById(assignee_id).select('email name');
    
    if (user?.email) {
      const stepsListHtml = steps.map((s, i) => `<li><b>Step ${i+1}:</b> ${s}</li>`).join('');
      const stepsListText = steps.map((s, i) => `Step ${i+1}: ${s}`).join('\n');

      emailQueue.add({
        to: user.email,
        subject: `[Lead Alert] ${lead.name} assigned to you`,
        text: `Hello ${user.name},\n\nA new lead has been assigned to you.\n\nLead Details:\n- Name: ${lead.name}\n- Phone: ${lead.phone || 'N/A'}\n- Source: ${lead.source || 'N/A'}\n- Current Status: ${lead.status || 'New'}\n- Assigned By: ${assigner_name || 'Admin'}\n\nRecommended Action Steps:\n${stepsListText}\n\nPlease log in to the CRM: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/leads/${lead._id}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #2563eb, #1e40af); color: #fff; padding: 30px; text-align: center;">
              <h2 style="margin: 0; font-size: 24px;">New Lead Assigned</h2>
              <p style="margin-top: 10px; opacity: 0.9;">High-priority prospect requires your attention</p>
            </div>
            
            <div style="padding: 30px; background: #fff;">
              <p>Hello <b>${user.name}</b>,</p>
              <p>You have been assigned as the primary officer for a new lead. Please review the details below:</p>
              
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; font-weight: bold; color: #1e40af; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">Prospect Details</p>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 4px 0; color: #64748b; width: 100px;">Name:</td><td><b>${lead.name}</b></td></tr>
                  <tr><td style="padding: 4px 0; color: #64748b;">Phone:</td><td>${lead.phone || 'N/A'}</td></tr>
                  <tr><td style="padding: 4px 0; color: #64748b;">Source:</td><td><span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-size: 11px;">${lead.source || 'N/A'}</span></td></tr>
                  <tr><td style="padding: 4px 0; color: #64748b;">Status:</td><td><b>${lead.status || 'New'}</b></td></tr>
                </table>
              </div>

              <div style="margin-top: 25px;">
                <p style="margin: 0 0 15px 0; font-weight: bold; color: #1e40af;">Recommended Action Steps:</p>
                <ul style="padding-left: 0; list-style: none;">
                  ${steps.map((s, i) => `
                    <li style="margin-bottom: 12px; display: flex; align-items: flex-start;">
                      <span style="background: #2563eb; color: #fff; width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; margin-right: 12px; flex-shrink: 0; margin-top: 2px;">${i+1}</span>
                      <span>${s}</span>
                    </li>
                  `).join('')}
                </ul>
              </div>

              <div style="text-align: center; margin-top: 40px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/leads/${lead._id}" 
                   style="display: inline-block; background: #2563eb; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
                   View Lead in CRM
                </a>
              </div>
            </div>

            <div style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6;">
              This is an automated operational alert. Do not reply to this email.
            </div>
          </div>
        `,
        attachments
      });
    }
  } catch (err) {
    console.error('Lead assignment email failed:', err.message);
  }
};

/**
 * User Welcome Email with Password Reset Link
 */
exports.sendWelcomeEmailWithResetLink = async (userEmail, userName, resetToken, role, frontendUrl) => {
  const title = 'Welcome to CEM System - Account Created';
  const resetUrl = `${frontendUrl || 'http://localhost:5173'}/reset-password/${resetToken}`;

  const roleSteps = {
    'Admin': 'System Settings, User Management, and Company-wide Reports.',
    'Manager': 'Team performance, Lead assignments, and Sales analytics.',
    'HR': 'Employee records, Attendance tracking, and Payroll management.',
    'Accountant': 'Invoices, Payments, and Financial compliance reports.',
    'Employee': 'Personal leads, Follow-up tasks, and Sales execution.'
  };

  const roleSpecificSteps = roleSteps[role] || 'your designated operational dashboard.';

  try {
    emailQueue.add({
      to: userEmail,
      subject: title,
      text: `Hello ${userName},\n\nAn administrator has added you to CEM System as a ${role}.\n\nPlease click the link below to set your password and activate your account:\n${resetUrl}\n\nNote: This link will expire in 60 minutes.\n\nNext Steps:\n1. Set your password\n2. Complete your profile\n3. Start using ${roleSpecificSteps}\n\nBest regards,\nCEM System Admin`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="background: linear-gradient(135deg, #3b82f6, #1e40af); color: #fff; padding: 30px; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 10px;">👋</div>
            <h2 style="margin: 0; font-size: 24px;">Welcome to CEM System</h2>
            <p style="margin-top: 10px; opacity: 0.9;">You are now part of our team</p>
          </div>
          
          <div style="padding: 30px; background: #fff;">
            <p>Hello <b>${userName}</b>,</p>
            <p>An administrator has added you to the system with the role of <b>${role}</b>. To get started and activate your account, please set your password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="display: inline-block; background: #3b82f6; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);">
                 Set Your Password
              </a>
              <p style="margin-top: 15px; font-size: 12px; color: #94a3b8;">This link expires in 1 hour</p>
            </div>

            <div style="margin-top: 25px; background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <p style="margin: 0 0 10px 0; font-weight: bold; color: #1e40af;">Your Onboarding Steps:</p>
              <ul style="padding-left: 0; list-style: none; margin: 0;">
                <li style="margin-bottom: 8px;">• Set your password and log in</li>
                <li style="margin-bottom: 8px;">• Complete your personal profile</li>
                <li>• Access <b>${roleSpecificSteps}</b> from your dashboard</li>
              </ul>
            </div>
          </div>

          <div style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6;">
            If the button above doesn't work, copy and paste this link into your browser:<br/>
            <span style="word-break: break-all; color: #3b82f6;">${resetUrl}</span>
          </div>
        </div>
      `
    });
  } catch (err) {
    console.error('Welcome email failed:', err.message);
  }
};

/**
 * User Creation Notification (Email + In-App)
 */
exports.sendUserCreationEmail = async (userEmail, userName, tempPassword, role, frontendUrl) => {
  const title = 'Your CEM System Account is Ready';
  const loginUrl = `${frontendUrl || 'http://localhost:5173'}/login`;

  const roleSteps = {
    'Admin': 'System Settings, User Management, and Company-wide Reports.',
    'Manager': 'Team performance, Lead assignments, and Sales analytics.',
    'HR': 'Employee records, Attendance tracking, and Payroll management.',
    'Accountant': 'Invoices, Payments, and Financial compliance reports.',
    'Employee': 'Personal leads, Follow-up tasks, and Sales execution.'
  };

  const roleSpecificSteps = roleSteps[role] || 'your designated operational dashboard.';

  try {
    emailQueue.add({
      to: userEmail,
      subject: title,
      text: `Hello ${userName},\n\nAn administrator has added you to CEM System as a ${role}.\n\nYour Login Credentials:\n📧 Email: ${userEmail}\n🔑 Temporary Password: ${tempPassword}\n\nNext Steps:\n1. Log in: ${loginUrl}\n2. Change your password\n3. Complete your profile\n4. Access ${roleSpecificSteps}\n\nBest regards,\nCEM System Admin`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="background: linear-gradient(135deg, #10b981, #059669); color: #fff; padding: 30px; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 10px;">🎉</div>
            <h2 style="margin: 0; font-size: 24px;">Welcome to CEM System</h2>
            <p style="margin-top: 10px; opacity: 0.9;">Your account has been successfully created</p>
          </div>
          
          <div style="padding: 30px; background: #fff;">
            <p>Hello <b>${userName}</b>,</p>
            <p>Congratulations! An administrator has added you to the system as a <b>${role}</b>. You can now access the system using the credentials below:</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px dashed #10b981; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; font-weight: bold; color: #059669; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">Your Login Credentials</p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; color: #64748b; width: 140px;">Email:</td><td><b>${userEmail}</b></td></tr>
                <tr><td style="padding: 6px 0; color: #64748b;">Temp Password:</td><td><code style="background: #fff; padding: 2px 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold; color: #b91c1c;">${tempPassword}</code></td></tr>
                <tr><td style="padding: 6px 0; color: #64748b;">Role:</td><td><span style="background: #dcfce7; color: #065f46; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">${role}</span></td></tr>
              </table>
            </div>

            <div style="margin-top: 25px;">
              <p style="margin: 0 0 15px 0; font-weight: bold; color: #059669;">Next Steps:</p>
              <ul style="padding-left: 0; list-style: none;">
                <li style="margin-bottom: 12px; display: flex; align-items: flex-start;">
                  <span style="background: #10b981; color: #fff; width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 12px; flex-shrink: 0; margin-top: 2px;">1</span>
                  <span>Click the button below to log in.</span>
                </li>
                <li style="margin-bottom: 12px; display: flex; align-items: flex-start;">
                  <span style="background: #10b981; color: #fff; width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 12px; flex-shrink: 0; margin-top: 2px;">2</span>
                  <span><b>Important:</b> For security reasons, please change your password immediately after logging in.</span>
                </li>
                <li style="margin-bottom: 12px; display: flex; align-items: flex-start;">
                  <span style="background: #10b981; color: #fff; width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 12px; flex-shrink: 0; margin-top: 2px;">3</span>
                  <span>Complete your personal profile (Phone, Address, etc.).</span>
                </li>
                <li style="margin-bottom: 12px; display: flex; align-items: flex-start;">
                  <span style="background: #10b981; color: #fff; width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 12px; flex-shrink: 0; margin-top: 2px;">4</span>
                  <span>Access <b>${roleSpecificSteps}</b> based on your assigned role.</span>
                </li>
              </ul>
            </div>

            <div style="text-align: center; margin-top: 40px;">
              <a href="${loginUrl}" 
                 style="display: inline-block; background: #10b981; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.3);">
                 Click Here to Log In
              </a>
            </div>
          </div>

          <div style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6;">
            This is an automated email. Please do not reply.<br/>
            &copy; ${new Date().getFullYear()} CEM System Admin Team.
          </div>
        </div>
      `
    });
  } catch (err) {
    console.error('User creation email failed:', err.message);
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
  const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/users`;

  await Promise.all(adminEmails.map(email => sendEmail({
    to: email,
    subject: `[CRM] New Demo User Registration Request`,
    text: `A new demo user ${user.name} (${user.email}) has registered.\nReview in dashboard: ${dashboardUrl}`,
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
          <div style="margin-top: 24px;">
            <a href="${dashboardUrl}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Open User Dashboard</a>
          </div>
        </div>
      </div>
    `,
  })));
};

exports.sendInstantRegistrationAlert = async (user, companyName) => {
  const adminEmails = ['prasadghadge748@gmail.com', 'prasadghadge2212@gmail.com'];
  const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`;
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
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
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
