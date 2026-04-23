const nodemailer = require('nodemailer');
const Company = require('../models/Company');
const fs = require('fs');
const path = require('path');

function logToFile(msg) {
  const logPath = path.join(__dirname, '..', 'email_debug.log');
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logPath, `[${timestamp}] ${msg}\n`);
}

function buildCandidates({ companyLabel, dbSmtp }) {
  const candidates = [];

  // 1) DB SMTP (if configured)
  if (dbSmtp && dbSmtp.host && dbSmtp.user && dbSmtp.password) {
    const dbPort = Number.parseInt(dbSmtp.port, 10) || 587;
    candidates.push({
      name: 'db_smtp',
      from: `"${companyLabel}" <${dbSmtp.user}>`,
      transporter: nodemailer.createTransport({
        host: dbSmtp.host,
        port: dbPort,
        secure: dbPort === 465,
        auth: { user: dbSmtp.user, pass: dbSmtp.password },
      }),
    });
  }

  // 2) ENV Gmail fallback (EMAIL_USER/EMAIL_PASS)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    candidates.push({
      name: 'env_gmail',
      from: `"${companyLabel}" <${process.env.EMAIL_USER}>`,
      transporter: nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      }),
    });
  }

  return candidates;
}

async function trySendWithCandidates({ candidates, to, subject, text, html }) {
  let lastError;

  for (const candidate of candidates) {
    try {
      const info = await candidate.transporter.sendMail({
        from: candidate.from,
        to,
        subject,
        text,
        html,
      });

      console.log(`SUCCESS: Email sent via [${candidate.name}] to ${to}. MessageId: ${info.messageId}`);
      logToFile(`SUCCESS: via=${candidate.name} to=${to} messageId=${info.messageId}`);
      return info;
    } catch (error) {
      lastError = error;
      console.error(`SMTP ERROR: Delivery failed via [${candidate.name}]`);
      console.error(`Target: ${to}`);
      console.error(`Subject: ${subject}`);
      console.error(`Error Code: ${error.code || 'N/A'}`);
      console.error(`Error Message: ${error.message}`);
      logToFile(`ERROR: via=${candidate.name} to=${to} code=${error.code || 'N/A'} message=${error.message}`);

      const msg = String(error?.message || '').toLowerCase();
      if (msg.includes('eauth') || msg.includes('invalid login') || msg.includes('bad credentials')) {
        console.warn('TIP: Gmail requires an App Password (not your normal password) when 2-Step Verification is enabled.');
      }
    }
  }

  throw lastError || new Error('Failed to send email (unknown error).');
}

exports.sendEmail = async ({ to, subject, text, html }) => {
  let company = null;
  try {
    company = await Company.findOne();
  } catch (err) {
    console.warn('WARN: Company lookup failed while sending email; continuing with ENV settings only.');
    logToFile(`WARN: company_lookup_failed message=${err?.message || err}`);
  }

  const companyLabel = company?.company_name || company?.name || 'CRM System';
  const dbSmtp = company?.settings?.smtp;

  const candidates = buildCandidates({ companyLabel, dbSmtp });

  if (candidates.length === 0) {
    const msg = 'CRITICAL EMAIL ERROR: No transporter configured (DB SMTP or EMAIL_USER/EMAIL_PASS).';
    console.error(msg);
    logToFile(`ERROR: ${msg}`);
    throw new Error(msg);
  }

  if (process.env.EMAIL_PASS === 'your_gmail_app_password_here') {
    const msg = 'EMAIL_PASS is still the placeholder value; replace it with a real Gmail App Password.';
    console.warn(msg);
    logToFile(`WARN: ${msg}`);
  }

  console.log(`Attempting to send email: "${subject}" to [${to}]`);
  logToFile(`SEND: subject="${subject}" to="${to}" candidates=${candidates.map((c) => c.name).join(',')}`);

  return trySendWithCandidates({ candidates, to, subject, text, html });
};
