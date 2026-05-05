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

async function trySendWithCandidates({ candidates, to, subject, text, html, attachments = [] }) {
  let lastError;
  const maxRetries = 3;

  for (const candidate of candidates) {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        const info = await candidate.transporter.sendMail({
          from: candidate.from,
          to,
          subject,
          text,
          html,
          attachments,
        });

        console.log(`SUCCESS: Email sent via [${candidate.name}] to ${to}. Attempt ${attempt + 1}. MessageId: ${info.messageId}`);
        logToFile(`SUCCESS: via=${candidate.name} to=${to} attempt=${attempt + 1} messageId=${info.messageId}`);
        return info;
      } catch (error) {
        attempt++;
        lastError = error;
        console.error(`SMTP ERROR: Delivery failed via [${candidate.name}] (Attempt ${attempt}/${maxRetries})`);
        logToFile(`ERROR: via=${candidate.name} to=${to} attempt=${attempt} code=${error.code || 'N/A'} message=${error.message}`);

        if (attempt >= maxRetries) {
          console.error(`Max retries reached for [${candidate.name}]. Trying next candidate if available.`);
        } else {
          // Exponential backoff or simple delay
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); 
        }
      }
    }
  }

  throw lastError || new Error('Failed to send email after multiple attempts.');
}

exports.sendEmail = async ({ to, subject, text, html, attachments = [] }) => {
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

  return trySendWithCandidates({ candidates, to, subject, text, html, attachments });
};
