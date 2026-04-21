const nodemailer = require('nodemailer');
const Company = require('../models/Company');

exports.sendEmail = async ({ to, subject, text, html }) => {
  // 1. Try to fetch organization SMTP settings from DB
  const company = await Company.findOne();
  const dbSmtp = company?.settings?.smtp;

  let transporter;

  if (dbSmtp && dbSmtp.host && dbSmtp.user && dbSmtp.password) {
    // USE DATABASE SETTINGS
    transporter = nodemailer.createTransport({
      host: dbSmtp.host,
      port: parseInt(dbSmtp.port) || 587,
      secure: dbSmtp.port === '465',
      auth: { user: dbSmtp.user, pass: dbSmtp.password },
    });
  } else if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    // FALLBACK TO ENVIRONMENT SETTINGS (GMAIL BY DEFAULT)
    console.log('Using fallback [ENVIRONMENT] email settings.');
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }

  if (!transporter) {
    console.error('CRITICAL: No email configuration found (DB or ENV). Email not sent.');
    return;
  }

  const mailOptions = {
    from: `"${company?.name || 'CRM System'}" <${process.env.EMAIL_USER || 'no-reply@crm.com'}>`,
    to,
    subject,
    text,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent successfully to ${to}`);
    return info;
  } catch (error) {
    console.error('--- SMTP ERROR ---');
    console.error(`Status: FAILED to send email to ${to}`);
    console.error(`Error: ${error.message}`);
    
    if (error.message.includes('EAUTH') || error.message.toLowerCase().includes('invalid login')) {
      console.warn('💡 TIP: It looks like a Gmail login error. You MUST use an "App Password" (not your regular one) if 2-Step Verification is on.');
    }
    
    // Throw error so caller knows it failed
    throw error;
  }
};
