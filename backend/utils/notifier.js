const Notification = require('../models/Notification');
const User = require('../models/User');
const DemoUser = require('../models/DemoUser');
const { sendEmail } = require('./emailService');

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

  // 1. Create In-app Notification
  const notification = await Notification.create({
    user_id,
    user_id_model: resolvedModel,
    title,
    message,
    type,
    linked_entity_id,
    linked_entity_type,
  });

  // 2. Optional Email Notification
  if (send_email) {
    const user = resolvedModel === 'DemoUser'
      ? await DemoUser.findById(user_id)
      : await User.findById(user_id);

    if (user?.email) {
      // Check user preference (assuming they have one in settings)
      // For now, respect the send_email flag
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

exports.notifyRoleUsers = async ({ company_id, role, title, message, linked_entity_id, linked_entity_type, send_email = false }) => {
  const users = await User.find({ company_id, role, status: 'active' });
  if (!users || users.length === 0) return [];
  return Promise.all(users.map(user => exports.notify({
    user_id: user.id,
    title,
    message,
    type: 'info',
    linked_entity_id,
    linked_entity_type,
    send_email,
  })));
};

exports.notifyAdmin = async ({ title, message, data = {} }) => {
  const adminEmail = process.env.CONTACT_EMAIL || 'prasadghadge2212@gmail.com';
  const adminPhone = process.env.DEFAULT_ADMIN_PHONE || '9766875355';

  console.log('--- ADMIN NOTIFICATION ---');
  console.log(`Title: ${title}`);
  console.log(`Message: ${message}`);
  console.log('--------------------------');

  // 1. Send REAL Email to Prasad
  try {
    await sendEmail({
      to: adminEmail,
      subject: `[CRM ALERT] ${title}`,
      text: message,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #3b82f6;">New Lead Notification</h2>
          <p><strong>Event:</strong> ${title}</p>
          <p>${message}</p>
          <hr />
          <p style="font-size: 0.9rem; color: #666;">
            Check your CRM dashboard for more details.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Failed to send admin email:', err.message);
  }

  // 2. REAL SMS/WhatsApp via Twilio
  const hasTwilio = process.env.TWILIO_SID && process.env.TWILIO_TOKEN;
  
  if (hasTwilio) {
    try {
      const client = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
      
      // Send WhatsApp
      await client.messages.create({
        body: `[CRM ALERT] ${title}: ${message}`,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_SENDER || '+14155238886'}`,
        to: `whatsapp:+91${adminPhone}`
      });
      console.log(`💬 WhatsApp sent to +91${adminPhone}`);

      // Send SMS
      await client.messages.create({
        body: `[CRM ALERT] ${title}: ${message.substring(0, 100)}...`,
        from: process.env.TWILIO_PHONE_NUMBER || '', // Needs a Twilio number for SMS
        to: `+91${adminPhone}`
      });
      console.log(`📱 SMS sent to +91${adminPhone}`);

    } catch (err) {
      console.error('Twilio notification failed:', err.message);
    }
  } else {
    // Simulated fallback
    console.log(`💡 [SIMULATED] Would send SMS/WhatsApp to +91 ${adminPhone}`);
    console.log('   To activate real-time phone alerts, add TWILIO_SID and TWILIO_TOKEN to your .env file.');
  }

  return true;
};
