const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const { sendEmail } = require('./utils/emailService');

async function test() {
  console.log('--- EMAIL CONFIGURATION TEST ---');
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '******** (Hidden)' : 'NOT SET');
  console.log('CONTACT_EMAIL:', process.env.CONTACT_EMAIL);
  console.log('--------------------------------');

  if (process.env.EMAIL_PASS === 'your_gmail_app_password_here') {
    console.error('FAILED: You are still using the placeholder EMAIL_PASS.');
    console.error('Please update your .env file with a real Gmail App Password.');
    process.exit(1);
  }

  try {
    console.log('Sending test email to prasadghadge748@gmail.com...');
    await sendEmail({
      to: 'prasadghadge748@gmail.com',
      subject: 'CRM Email Test',
      text: 'If you are reading this, your SMTP settings are working perfectly!',
      html: '<h1>Gmail SMTP Working!</h1><p>Your CRM system is now ready to send notifications.</p>',
    });
    console.log('TEST PASSED: Check your inbox at prasadghadge748@gmail.com');
  } catch (err) {
    console.error('TEST FAILED');
    console.error('Error Details:', err.message);
    process.exit(1);
  }
}

test();
