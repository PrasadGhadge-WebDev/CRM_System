const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const User = require('../models/User');
const Company = require('../models/Company');
const Counter = require('../models/Counter');
const logger = require('../utils/logger');
const { sendEmail } = require('../utils/emailService');

// Helper to get next lead ID
async function getNextLeadId(companyId) {
  const counter = await Counter.findOneAndUpdate(
    { company_id: companyId, model: 'Lead', field: 'leadId' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${counter.prefix || 'LD-'}${counter.seq}`;
}

// @route   POST /api/contact
// @desc    Handle contact form submission & Save as Lead
// @access  Public
router.post('/', async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  try {
    // 1. Log the contact request
    logger.info(`Contact Form Submission: From ${name} (${email}) - Subject: ${subject}`);

    // 2. Find System Workspace and Admin
    const defaultCompany = await Company.findOne({ company_name: 'System Workspace' }) || await Company.findOne();
    if (!defaultCompany) {
        throw new Error('No system company found');
    }

    const adminUser = await User.findOne({ company_id: defaultCompany._id, role: 'Admin' }) || await User.findOne({ role: 'Admin' });
    if (!adminUser) {
        throw new Error('No admin user found to assign the lead');
    }

    // 3. Prepare Lead Data
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Unknown';

    const leadId = await getNextLeadId(defaultCompany._id);

    // 4. Create Lead in Database
    const newLead = await Lead.create({
        company_id: defaultCompany._id,
        leadId: leadId,
        firstName,
        lastName,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: '0000000000', // Placeholder since contact form doesn't have phone yet
        source: 'Website Form',
        status: 'New',
        priority: 'Medium',
        assignedTo: adminUser._id,
        assignedToModel: 'User',
        notes: `Subject: ${subject}\n\nMessage: ${message}`,
        followUpDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default follow-up in 24h
    });

    logger.info(`Lead created successfully: ${leadId} for ${name}`);

    // 5. Send email to admin
    try {
        await sendEmail({
            to: process.env.CONTACT_EMAIL || process.env.ADMIN_EMAIL || adminUser.email || 'divinetechnologies8@gmail.com',
            subject: `New Lead from Website: ${subject}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px;">
                    <h2 style="color: #3b82f6;">New Website Inquiry</h2>
                    <p>A new lead has been captured from your website contact form.</p>
                    <hr style="border: 0; border-top: 1px solid #eee;" />
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Lead ID:</strong> ${leadId}</p>
                    <p><strong>Subject:</strong> ${subject}</p>
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 15px;">
                        <p><strong>Message:</strong></p>
                        <p style="white-space: pre-wrap;">${message}</p>
                    </div>
                    <p style="margin-top: 20px;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/leads/${newLead._id}" 
                           style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                           View Lead in CRM
                        </a>
                    </p>
                </div>
            `
        });
    } catch (emailError) {
        logger.error('Failed to send contact email:', emailError.message);
    }

    res.status(200).json({ 
        success: true, 
        message: 'Your message has been received and a lead has been created in our system.' 
    });
  } catch (error) {
    logger.error('Error handling contact form:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

module.exports = router;
