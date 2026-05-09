const mongoose = require('mongoose');
const User = require('../models/User');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Deal = require('../models/Deal');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const SupportTicket = require('../models/SupportTicket');
const Activity = require('../models/Activity');
const Note = require('../models/Note');
const LeadNote = require('../models/LeadNote');
const CustomerNote = require('../models/CustomerNote');
const Notification = require('../models/Notification');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const SalarySlip = require('../models/SalarySlip');
const PerformanceReview = require('../models/PerformanceReview');
const FollowupHistory = require('../models/FollowupHistory');
const JobPosting = require('../models/JobPosting');
const CandidateApplication = require('../models/CandidateApplication');
const Counter = require('../models/Counter');
const { syncCustomerFinancials, syncDealFinancials } = require('./financialsSync');

const DEMO_PASSWORD = 'Demo@1234';

const indianProfiles = [
  {
    person: 'Ananya Sharma',
    company: 'Aarohan Tech Private Limited',
    city: 'Mumbai',
    postalCode: '400001',
    address: 'BKC, Bandra East',
    state: 'Maharashtra',
    source: 'Website',
    product: 'CRM Growth Suite',
    leadStatus: 'Qualified',
    leadPriority: 'High',
    customerStatus: 'Active',
    dealStage: 'Won',
    dealStatus: 'Completed',
    invoiceStatus: 'Paid',
    paymentMode: 'UPI',
    paymentStatus: 'Paid',
    ticketStatus: 'resolved',
    expenseCategory: 'Software',
    industry: 'Technology',
    role: 'Employee',
    department: 'Sales',
  },
  {
    person: 'Rohan Verma',
    company: 'Pragati Retail LLP',
    city: 'Delhi',
    postalCode: '110001',
    address: 'Connaught Place',
    state: 'Delhi',
    source: 'Referral',
    product: 'Retail Automation Pack',
    leadStatus: 'Contacted',
    leadPriority: 'Warm',
    customerStatus: 'Prospect',
    dealStage: 'Proposal',
    dealStatus: 'Pending',
    invoiceStatus: 'Sent',
    paymentMode: 'Bank Transfer',
    paymentStatus: 'Partial',
    ticketStatus: 'in-progress',
    expenseCategory: 'Travel',
    industry: 'Retail',
    role: 'Employee',
    department: 'Sales',
  },
  {
    person: 'Meera Iyer',
    company: 'Sattva Healthcare Solutions',
    city: 'Bengaluru',
    postalCode: '560001',
    address: 'MG Road',
    state: 'Karnataka',
    source: 'LinkedIn',
    product: 'Patient Outreach CRM',
    leadStatus: 'New',
    leadPriority: 'Medium',
    customerStatus: 'Prospect',
    dealStage: 'Qualification',
    dealStatus: 'Open',
    invoiceStatus: 'Draft',
    paymentMode: 'Online',
    paymentStatus: 'Pending',
    ticketStatus: 'new',
    expenseCategory: 'Marketing',
    industry: 'Healthcare',
    role: 'Employee',
    department: 'Sales',
  },
  {
    person: 'Arjun Patel',
    company: 'Shree Buildcon Infra',
    city: 'Ahmedabad',
    postalCode: '380001',
    address: 'SG Highway',
    state: 'Gujarat',
    source: 'Facebook Ads',
    product: 'Site Ops CRM',
    leadStatus: 'Qualified',
    leadPriority: 'Hot',
    customerStatus: 'Active',
    dealStage: 'Negotiation',
    dealStatus: 'Pending',
    invoiceStatus: 'Partially Paid',
    paymentMode: 'Cheque',
    paymentStatus: 'Partial',
    ticketStatus: 'assigned',
    expenseCategory: 'Operations',
    industry: 'Real Estate',
    role: 'Employee',
    department: 'Sales',
  },
  {
    person: 'Kavya Nair',
    company: 'BlueLotus Finserv',
    city: 'Pune',
    postalCode: '411001',
    address: 'Koregaon Park',
    state: 'Maharashtra',
    source: 'Manual Entry',
    product: 'Finance Insight CRM',
    leadStatus: 'Follow-up',
    leadPriority: 'High',
    customerStatus: 'Active',
    dealStage: 'Won',
    dealStatus: 'Closed',
    invoiceStatus: 'Paid',
    paymentMode: 'Card',
    paymentStatus: 'Paid',
    ticketStatus: 'closed',
    expenseCategory: 'Office Supplies',
    industry: 'Finance',
    role: 'Employee',
    department: 'Sales',
  },
  {
    person: 'Vikram Singh',
    company: 'Rashtra Logistics',
    city: 'Jaipur',
    postalCode: '302001',
    address: 'Malviya Nagar',
    state: 'Rajasthan',
    source: 'Walk-in',
    product: 'Fleet Workflow Suite',
    leadStatus: 'Contacted',
    leadPriority: 'Medium',
    customerStatus: 'Active',
    dealStage: 'Prospecting',
    dealStatus: 'Open',
    invoiceStatus: 'Sent',
    paymentMode: 'Cash',
    paymentStatus: 'Pending',
    ticketStatus: 'open',
    expenseCategory: 'Fuel',
    industry: 'Logistics',
    role: 'Employee',
    department: 'Operations',
  },
  {
    person: 'Sneha Kulkarni',
    company: 'EcoHarvest Foods',
    city: 'Nagpur',
    postalCode: '440001',
    address: 'Civil Lines',
    state: 'Maharashtra',
    source: 'Website',
    product: 'Distribution CRM',
    leadStatus: 'New',
    leadPriority: 'Low',
    customerStatus: 'Prospect',
    dealStage: 'New',
    dealStatus: 'Open',
    invoiceStatus: 'Draft',
    paymentMode: 'UPI',
    paymentStatus: 'Pending',
    ticketStatus: 'waiting',
    expenseCategory: 'Training',
    industry: 'Manufacturing',
    role: 'HR',
    department: 'People Ops',
  },
  {
    person: 'Aditya Rao',
    company: 'VidyaSphere Learning',
    city: 'Hyderabad',
    postalCode: '500001',
    address: 'Madhapur',
    state: 'Telangana',
    source: 'Referral',
    product: 'Admissions CRM',
    leadStatus: 'Qualified',
    leadPriority: 'Warm',
    customerStatus: 'Active',
    dealStage: 'Proposal',
    dealStatus: 'Pending',
    invoiceStatus: 'Overdue',
    paymentMode: 'Bank Transfer',
    paymentStatus: 'Pending',
    ticketStatus: 'in-progress',
    expenseCategory: 'Consulting',
    industry: 'Education',
    role: 'Manager',
    department: 'Sales',
  },
  {
    person: 'Priya Menon',
    company: 'Samudra Exports',
    city: 'Kochi',
    postalCode: '682001',
    address: 'Marine Drive',
    state: 'Kerala',
    source: 'Cold Call',
    product: 'Export Pipeline CRM',
    leadStatus: 'Contacted',
    leadPriority: 'Cold',
    customerStatus: 'Inactive',
    dealStage: 'Lost',
    dealStatus: 'Closed',
    invoiceStatus: 'Cancelled',
    paymentMode: 'Other',
    paymentStatus: 'Failed',
    ticketStatus: 'closed',
    expenseCategory: 'Vendor',
    industry: 'Export',
    role: 'Accountant',
    department: 'Finance',
  },
  {
    person: 'Rahul Choudhary',
    company: 'MetroServe Facilities',
    city: 'Chandigarh',
    postalCode: '160017',
    address: 'Sector 17',
    state: 'Chandigarh',
    source: 'Google Ads',
    product: 'Service Desk CRM',
    leadStatus: 'Qualified',
    leadPriority: 'High',
    customerStatus: 'Active',
    dealStage: 'Negotiation',
    dealStatus: 'Pending',
    invoiceStatus: 'Sent',
    paymentMode: 'Online',
    paymentStatus: 'Partial',
    ticketStatus: 'assigned',
    expenseCategory: 'Utilities',
    industry: 'Services',
    role: 'Employee',
    department: 'Support',
  },
];

const extraUsers = [
  { name: 'Ritu Malhotra', username: 'ritu.malhotra', role: 'Manager', department: 'Sales', designation: 'Regional Sales Manager', city: 'Delhi', salary: 98000 },
  { name: 'Devansh Joshi', username: 'devansh.joshi', role: 'Accountant', department: 'Finance', designation: 'Senior Accountant', city: 'Pune', salary: 76000 },
  { name: 'Neha Bhosale', username: 'neha.bhosale', role: 'HR', department: 'People Ops', designation: 'HR Business Partner', city: 'Mumbai', salary: 72000 },
  { name: 'Amit Tiwari', username: 'amit.tiwari', role: 'Employee', department: 'Sales', designation: 'Sales Executive', city: 'Lucknow', salary: 42000 },
  { name: 'Pooja Desai', username: 'pooja.desai', role: 'Employee', department: 'Sales', designation: 'Inside Sales Executive', city: 'Ahmedabad', salary: 44000 },
  { name: 'Nitin Reddy', username: 'nitin.reddy', role: 'Employee', department: 'Operations', designation: 'Operations Analyst', city: 'Hyderabad', salary: 46000 },
  { name: 'Shreya Kapoor', username: 'shreya.kapoor', role: 'Employee', department: 'Support', designation: 'Customer Success Executive', city: 'Chandigarh', salary: 43000 },
  { name: 'Harsh Vardhan', username: 'harsh.vardhan', role: 'Employee', department: 'Sales', designation: 'Business Development Executive', city: 'Jaipur', salary: 45000 },
  { name: 'Ishita Sen', username: 'ishita.sen', role: 'Employee', department: 'Marketing', designation: 'Growth Associate', city: 'Kolkata', salary: 47000 },
];

const jobTemplates = [
  { title: 'Sales Executive', department: 'Sales', location: 'Mumbai', type: 'Full-time' },
  { title: 'Customer Success Associate', department: 'Support', location: 'Bengaluru', type: 'Full-time' },
  { title: 'HR Operations Intern', department: 'People Ops', location: 'Pune', type: 'Internship' },
];

function createDate(offsetDays, hour = 10, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function createOne(Model, doc, options = {}) {
  const created = await Model.create([doc], options);
  return created[0];
}

async function createMany(Model, docs, options = {}) {
  const created = [];
  for (const doc of docs) {
    created.push(await createOne(Model, doc, options));
  }
  return created;
}

async function getNextSequence(companyId, model, field, prefix, start = 1000, options = {}) {
  let counter = await Counter.findOne({ company_id: companyId, model, field });

  if (!counter) {
    counter = await createOne(
      Counter,
      {
        company_id: companyId,
        model,
        field,
        prefix,
        seq: start - 1,
      },
      options
    );
  }

  counter.seq += 1;
  counter.prefix = prefix;
  await counter.save(options);

  return `${counter.prefix}${String(counter.seq).padStart(3, '0')}`;
}

function buildFollowup(profile, index, assignedUserId) {
  const contactDate = createDate(-(index + 2), 11, 15);
  const nextDate = createDate(index + 1, 15, 0);
  const followupType = ['Call', 'Meeting', 'Email', 'WhatsApp', 'Demo'][index % 5];
  const historyStatus = index % 3 === 0 ? 'planned' : 'completed';

  return {
    contactDate,
    nextDate,
    historyStatus,
    followupType,
    statusAfterCall: index % 4 === 0 ? 'Demo Scheduled' : index % 4 === 1 ? 'Interested' : index % 4 === 2 ? 'Negotiation' : 'Call Later',
    note: `${profile.person} from ${profile.company} discussed ${profile.product} and wants a city-specific rollout plan.`,
    assignedUserId,
  };
}

function buildInvoiceStatus(totalAmount, paidAmount, requestedStatus, dueDate) {
  if (requestedStatus === 'Cancelled') return 'Cancelled';
  if (paidAmount >= totalAmount) return 'Paid';
  if (paidAmount > 0) return 'Partially Paid';
  if (requestedStatus === 'Overdue' || dueDate < new Date()) return 'Overdue';
  if (requestedStatus === 'Draft') return 'Draft';
  return 'Sent';
}

const seedDemoData = async (companyId, userId, userModel = 'User', options = {}) => {
  if (!userId) {
    throw new Error('userId is required for demo data seeding.');
  }

  const companyObjectId = mongoose.Types.ObjectId.isValid(companyId) ? new mongoose.Types.ObjectId(companyId) : companyId;
  const targetUserId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
  const companyTag = String(companyObjectId).slice(-6).toLowerCase();

  try {
    const existingLeads = await Lead.countDocuments({ company_id: companyObjectId });
    if (existingLeads >= 10) {
      console.log(`[Seeder] Demo data already present for company ${companyObjectId}. Skipping.`);
      return;
    }

    const seededUsers = [];
    for (let i = 0; i < extraUsers.length; i += 1) {
      const employee = extraUsers[i];
      const createdUser = await createOne(
        User,
        {
          company_id: companyObjectId,
          username: `${employee.username}.${companyTag}`,
          name: employee.name,
          email: `${employee.username.replace(/\./g, '')}.${companyTag}@demo.crm`,
          phone: `90000000${String(i + 11).padStart(2, '0')}`,
          role: employee.role,
          password: DEMO_PASSWORD,
          force_password_change: false,
          status: 'active',
          is_profile_complete: true,
          employee_id: `EMP-${companyTag.toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
          department: employee.department,
          designation: employee.designation,
          joining_date: createDate(-(160 + i * 15)),
          date_of_birth: createDate(-(9000 + i * 120)),
          address: `${employee.city}, India`,
          basic_salary: employee.salary,
          allowances: Math.round(employee.salary * 0.2),
          deductions: Math.round(employee.salary * 0.08),
        },
        options
      );

      seededUsers.push(createdUser);
    }

    const managerUser = seededUsers.find((item) => item.role === 'Manager') || seededUsers[0];
    const hrUser = seededUsers.find((item) => item.role === 'HR') || targetUserId;
    const accountantUser = seededUsers.find((item) => item.role === 'Accountant') || seededUsers[1] || targetUserId;
    const allAssignableUsers = [targetUserId, ...seededUsers.map((item) => item._id)];

    for (const employee of seededUsers) {
      if (!employee.manager_id && String(employee._id) !== String(managerUser._id)) {
        employee.manager_id = managerUser._id;
        await employee.save();
      }
    }

    const createdJobs = await createMany(
      JobPosting,
      jobTemplates.map((job, index) => ({
        company_id: companyObjectId,
        title: job.title,
        department: job.department,
        location: job.location,
        type: job.type,
        description: `${job.title} role for our Indian demo workspace with strong ownership and client communication focus.`,
        requirements: 'Good communication, CRM familiarity, and documentation discipline.',
        status: 'Open',
        posted_by: hrUser._id || hrUser,
      })),
      options
    );

    const createdLeads = [];
    for (let i = 0; i < indianProfiles.length; i += 1) {
      const profile = indianProfiles[i];
      const assignedUserId = allAssignableUsers[i % allAssignableUsers.length];
      const followup = buildFollowup(profile, i, assignedUserId);
      const leadId = `LD-DEMO-${String(i + 1).padStart(3, '0')}`;

      createdLeads.push(
        await createOne(
          Lead,
          {
            company_id: companyObjectId,
            leadId,
            firstName: profile.person.split(' ')[0],
            lastName: profile.person.split(' ').slice(1).join(' '),
            name: `${profile.person} - ${profile.company}`,
            email: `${profile.person.toLowerCase().replace(/\s+/g, '.')}@${profile.company.toLowerCase().replace(/[^a-z0-9]+/g, '')}.in`,
            phone: `90010000${String(i + 1).padStart(2, '0')}`,
            alternate_phone: `90110000${String(i + 1).padStart(2, '0')}`,
            company: profile.company,
            source: profile.source,
            status: i < 4 ? 'Converted' : profile.leadStatus,
            priority: profile.leadPriority,
            interested_product: profile.product,
            budget_range: ['10k-50k', '50k-1L', '1L-5L', '5L+'][i % 4],
            dealAmount: 0,
            currency: 'INR',
            assignedTo: assignedUserId,
            assignedToModel: 'User',
            createdBy: targetUserId,
            createdByModel: 'User',
            followUpDate: followup.nextDate,
            lastContactDate: followup.contactDate,
            nextFollowupDate: followup.nextDate,
            followupNote: followup.note,
            expectedClosingDate: createDate(i + 12),
            followupHistory: [
              {
                date: followup.contactDate,
                note: followup.note,
                lastContactDate: followup.contactDate,
                nextFollowupDate: followup.nextDate,
                status: followup.historyStatus,
                followupType: followup.followupType,
                assignedTo: assignedUserId,
                assignedToModel: 'User',
                priority: i % 2 === 0 ? 'High' : 'Medium',
                statusAfterCall: followup.statusAfterCall,
                reminder: true,
                reminderTime: '15:00',
                reminderOffsets: ['15m'],
                isDone: followup.historyStatus === 'completed',
              },
            ],
            notes: `Indian demo lead for ${profile.industry}. Shared interest in ${profile.product}.`,
            remarks_internal: `Focus on ${profile.city} rollout and GST-compliant billing.`,
            address: profile.address,
            city: profile.city,
            state: profile.state,
            pincode: profile.postalCode,
          },
          options
        )
      );
    }

    await createMany(
      FollowupHistory,
      createdLeads.map((lead, index) => {
        const profile = indianProfiles[index];
        const followup = buildFollowup(profile, index, lead.assignedTo);
        return {
          company_id: companyObjectId,
          leadId: lead._id,
          contactDate: followup.contactDate,
          nextDate: followup.nextDate,
          note: followup.note,
          status: followup.historyStatus,
          followupType: followup.followupType,
          assignedTo: lead.assignedTo,
          assignedToModel: 'User',
          priority: index % 2 === 0 ? 'High' : 'Medium',
          statusAfterCall: followup.statusAfterCall,
          reminder: true,
          reminderTime: '15:00',
          reminderOffsets: ['15m'],
          isDone: followup.historyStatus === 'completed',
          createdBy: targetUserId,
          createdByModel: 'User',
        };
      }),
      options
    );

    const createdCustomers = [];
    for (let i = 0; i < indianProfiles.length; i += 1) {
      const profile = indianProfiles[i];
      const customerId = await getNextSequence(companyObjectId, 'Customer', 'customer_id', 'CUST-', 1001);
      const assignedUserId = allAssignableUsers[(i + 1) % allAssignableUsers.length];
      createdCustomers.push(
        await createOne(
          Customer,
          {
            company_id: companyObjectId,
            customer_id: customerId,
            name: profile.person,
            company_name: profile.company,
            gst_number: `27${String(i + 10).padStart(2, '0')}ABCDE${String(i).padStart(2, '0')}F1Z${(i % 9) + 1}`,
            email: `contact@${profile.company.toLowerCase().replace(/[^a-z0-9]+/g, '')}.in`,
            phone: `91020000${String(i + 1).padStart(2, '0')}`,
            alternate_phone: `91120000${String(i + 1).padStart(2, '0')}`,
            address: profile.address,
            city: profile.city,
            postal_code: profile.postalCode,
            status: profile.customerStatus,
            last_interaction_date: createDate(-(i + 1)),
            next_followup_date: createDate(i + 3),
            assigned_to: assignedUserId,
            assigned_to_model: 'User',
            assigned_by: managerUser._id,
            converted_from_lead_id: i < 4 ? createdLeads[i]._id : undefined,
            source: profile.source,
            notes: `${profile.company} is part of the Indian demo account base for ${profile.industry}.`,
            is_vip: i % 4 === 0,
          },
          options
        )
      );
    }

    const createdDeals = [];
    for (let i = 0; i < indianProfiles.length; i += 1) {
      const profile = indianProfiles[i];
      const baseValue = [85000, 120000, 64000, 210000, 98000, 76000, 54000, 142000, 68000, 110000][i];
      const paidAmount = profile.paymentStatus === 'Paid' ? baseValue : profile.paymentStatus === 'Partial' ? Math.round(baseValue * 0.45) : 0;
      const readableId = await getNextSequence(companyObjectId, 'Deal', 'readable_id', 'DEAL-', 1001);

      createdDeals.push(
        await createOne(
          Deal,
          {
            company_id: companyObjectId,
            customer_id: createdCustomers[i]._id,
            readable_id: readableId,
            name: `${profile.company} - ${profile.product}`,
            value: baseValue,
            currency: 'INR',
            stage: profile.dealStage,
            status: profile.dealStatus,
            expected_close_date: createDate(i + 18),
            actual_close_date: ['Won', 'Lost'].includes(profile.dealStage) ? createDate(-(i + 1)) : undefined,
            last_followup_date: createDate(-(i + 2)),
            next_followup_date: createDate(i + 2),
            assigned_to: allAssignableUsers[(i + 2) % allAssignableUsers.length],
            created_by: targetUserId,
            product_service: profile.product,
            quantity: 10 + i,
            price: baseValue,
            discount_percent: i % 3 === 0 ? 5 : 0,
            discount: i % 3 === 0 ? Math.round(baseValue * 0.05) : 0,
            description: `${profile.product} rollout for ${profile.city} operations with Indian tax and follow-up workflow coverage.`,
            notes: `Preferred go-live within ${30 + i * 5} days.`,
            lost_reason: profile.dealStage === 'Lost' ? 'Budget shifted to another quarter' : '',
            priority: profile.leadPriority,
            invoice_status: ['Draft', 'Cancelled'].includes(profile.invoiceStatus) ? 'Pending' : 'Invoiced',
            payment_status: profile.paymentStatus === 'Paid' ? 'Paid' : profile.paymentStatus === 'Partial' ? 'Partial' : 'Unpaid',
            paid_amount: paidAmount,
          },
          options
        )
      );
    }

    for (let i = 0; i < 4; i += 1) {
      createdLeads[i].convertedCustomerId = createdCustomers[i]._id;
      createdLeads[i].convertedAt = createDate(-(i + 4));
      createdLeads[i].isConvertedToDeal = true;
      createdLeads[i].convertedDealId = createdDeals[i]._id;
      await createdLeads[i].save();
    }

    const createdProducts = await createMany(
      Product,
      indianProfiles.map((profile, index) => ({
        company_id: companyObjectId,
        name: profile.product,
        description: `${profile.product} package for Indian ${profile.industry.toLowerCase()} teams.`,
        price: [15000, 22000, 18000, 32000, 26000, 14000, 12000, 28000, 16000, 24000][index],
        category: 'Software',
        sku: `SKU-${companyTag.toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
        stock_quantity: 25 + index * 3,
        status: index === 8 ? 'inactive' : 'active',
      })),
      options
    );

    const createdOrders = await createMany(
      Order,
      indianProfiles.map((profile, index) => {
        const product = createdProducts[index];
        const secondary = createdProducts[(index + 1) % createdProducts.length];
        const items = [
          { name: product.name, quantity: 1 + (index % 3), price: product.price },
          { name: secondary.name, quantity: 1, price: Math.round(secondary.price * 0.4) },
        ];
        const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

        return {
          company_id: companyObjectId,
          customer_id: createdCustomers[index]._id,
          deal_id: createdDeals[index]._id,
          items,
          total_amount: totalAmount,
          currency: 'INR',
          status: profile.paymentStatus === 'Paid' ? 'paid' : profile.paymentStatus === 'Partial' ? 'shipped' : index === 8 ? 'cancelled' : 'pending',
          notes: `Demo order for ${profile.company} with Indian pricing and bundle structure.`,
        };
      }),
      options
    );

    const createdInvoices = [];
    for (let i = 0; i < indianProfiles.length; i += 1) {
      const profile = indianProfiles[i];
      const deal = createdDeals[i];
      const invoiceNumber = await getNextSequence(companyObjectId, 'Invoice', 'invoiceNumber', 'INV-', 101);
      const subtotal = deal.value;
      const taxRate = 18;
      const taxAmount = Math.round((subtotal * taxRate) / 100);
      const totalAmount = subtotal + taxAmount;
      const paidAmount = profile.paymentStatus === 'Paid' ? totalAmount : profile.paymentStatus === 'Partial' ? Math.round(totalAmount * 0.45) : 0;
      const dueDate = createDate(i - 2);
      const invoiceStatus = buildInvoiceStatus(totalAmount, paidAmount, profile.invoiceStatus, dueDate);

      createdInvoices.push(
        await createOne(
          Invoice,
          {
            company_id: companyObjectId,
            customer_id: createdCustomers[i]._id,
            deal_id: deal._id,
            invoice_number: invoiceNumber,
            items: [
              {
                description: `${profile.product} annual rollout`,
                quantity: 1,
                price: subtotal,
                discount: deal.discount || 0,
                hsn: `9983${i}`,
                amount: subtotal,
              },
            ],
            subtotal,
            discount: deal.discount || 0,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            paid_amount: paidAmount,
            status: invoiceStatus,
            due_date: dueDate,
            invoice_date: createDate(-(i + 12)),
            paid_date: paidAmount > 0 ? createDate(-(i % 5)) : undefined,
            notes: `GST invoice for ${profile.city} deployment.`,
            terms_and_conditions: 'Payment due within 15 days. Demo data for evaluation only.',
            gst_number: createdCustomers[i].gst_number,
            company_info: {
              name: 'Saarthi CRM Demo Pvt Ltd',
              address: 'Nariman Point, Mumbai',
              phone: '02240001234',
              email: 'billing@saarthicrm.demo',
              bank_name: 'HDFC Bank',
              account_number: '123456789012',
              ifsc_code: 'HDFC0001234',
              upi_id: 'saarthicrm@hdfcbank',
            },
            customer_info: {
              name: createdCustomers[i].name,
              phone: createdCustomers[i].phone,
              email: createdCustomers[i].email,
              address: `${createdCustomers[i].address}, ${createdCustomers[i].city}`,
            },
            assigned_to: accountantUser._id || accountantUser,
            next_follow_up: paidAmount < totalAmount ? createDate(i + 4) : undefined,
            created_by: targetUserId,
          },
          options
        )
      );
    }

    const createdPayments = [];
    for (let i = 0; i < indianProfiles.length; i += 1) {
      const profile = indianProfiles[i];
      const invoice = createdInvoices[i];
      const paidAmount = invoice.paid_amount;
      const paymentNumber = await getNextSequence(companyObjectId, 'Payment', 'paymentNumber', 'PAY-', 101);

      createdPayments.push(
        await createOne(
          Payment,
          {
            company_id: companyObjectId,
            payment_number: paymentNumber,
            customer_id: createdCustomers[i]._id,
            invoice_id: invoice._id,
            deal_id: createdDeals[i]._id,
            total_amount: invoice.total_amount,
            paid_amount: paidAmount,
            pending_amount: Math.max(0, invoice.total_amount - paidAmount),
            payment_date: paidAmount > 0 ? createDate(-(i % 4), 13, 30) : createDate(i + 2, 13, 30),
            payment_mode: profile.paymentMode,
            transaction_id: `TXN${companyTag.toUpperCase()}${String(i + 1).padStart(4, '0')}`,
            status: profile.paymentStatus,
            collected_by: accountantUser._id || accountantUser,
            notes: `Demo payment record for ${profile.company}.`,
            created_by: targetUserId,
          },
          options
        )
      );
    }

    const createdExpenses = await createMany(
      Expense,
      indianProfiles.map((profile, index) => ({
        company_id: companyObjectId,
        title: `${profile.expenseCategory} expense - ${profile.city}`,
        custom_id: `EXP-${companyTag.toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
        category: profile.expenseCategory,
        amount: [4500, 7200, 9800, 15600, 5300, 8700, 6600, 12400, 5900, 7300][index],
        tax_amount: [810, 1296, 1764, 2808, 954, 1566, 1188, 2232, 1062, 1314][index],
        date: createDate(-(index + 3)),
        vendor_name: `${profile.city} ${profile.expenseCategory} Services`,
        payment_method: ['UPI', 'Bank Transfer', 'Card', 'Cash'][index % 4],
        transaction_id: `EXPTRX${companyTag.toUpperCase()}${String(index + 1).padStart(3, '0')}`,
        note: `Expense logged for Indian demo finance module.`,
        created_by: targetUserId,
        paid_by: accountantUser._id || accountantUser,
        status: ['Approved', 'Completed', 'Pending'][index % 3],
        approved_by: ['Approved', 'Completed'].includes(['Approved', 'Completed', 'Pending'][index % 3]) ? accountantUser._id || accountantUser : undefined,
        approved_date: index % 3 !== 2 ? createDate(-(index + 2)) : undefined,
        payment_date: index % 3 === 1 ? createDate(-(index + 1)) : undefined,
      })),
      options
    );

    const createdTickets = [];
    for (let i = 0; i < indianProfiles.length; i += 1) {
      const profile = indianProfiles[i];
      createdTickets.push(
        await createOne(
          SupportTicket,
          {
            company_id: companyObjectId,
            customer_id: createdCustomers[i]._id,
            subject: `${profile.product} onboarding support for ${profile.city}`,
            description: `${profile.company} needs help with user roles, WhatsApp follow-ups, and Indian invoice sharing.`,
            status: profile.ticketStatus,
            priority: ['high', 'medium', 'urgent', 'low'][i % 4],
            assigned_to: allAssignableUsers[(i + 3) % allAssignableUsers.length],
            category: ['Onboarding', 'Billing', 'Configuration', 'Training'][i % 4],
            deadline: createDate(i + 5),
            closed_at: ['resolved', 'closed'].includes(profile.ticketStatus) ? createDate(-(i % 3)) : undefined,
            is_escalated: i % 4 === 0,
            escalation_reason: i % 4 === 0 ? 'Need faster branch rollout support' : '',
            escalated_by: i % 4 === 0 ? managerUser._id : undefined,
            escalated_at: i % 4 === 0 ? createDate(-(i + 1)) : undefined,
            solution: ['resolved', 'closed'].includes(profile.ticketStatus) ? 'Permissions and billing templates updated.' : '',
            messages: [
              {
                sender_id: targetUserId,
                sender_name: 'Demo Support Admin',
                sender_role: 'Admin',
                text: `Welcome ${profile.company}, we have started working on your ${profile.product} request.`,
                created_at: createDate(-(i + 1)),
              },
            ],
            notes: [
              {
                text: `Customer prefers support updates after 3 PM IST.`,
                author_name: 'Demo Support Admin',
                created_at: createDate(-(i + 1)),
              },
            ],
            history: [
              {
                action: 'Created',
                performed_by: targetUserId,
                performed_by_name: 'Demo Support Admin',
                details: `Ticket created for ${profile.company}.`,
                created_at: createDate(-(i + 1)),
              },
            ],
          },
          options
        )
      );
    }

    const createdActivities = await createMany(
      Activity,
      indianProfiles.map((profile, index) => ({
        company_id: companyObjectId,
        activity_type: ['call', 'meeting', 'email', 'task', 'follow-up'][index % 5],
        category: index % 2 === 0 ? 'manual' : 'system',
        color_code: ['blue', 'green', 'yellow', 'purple', 'gray'][index % 5],
        description: `${profile.person} activity for ${profile.company} in ${profile.city}.`,
        follow_up_mode: ['Call', 'Meeting', 'Email', 'WhatsApp', 'Demo'][index % 5],
        follow_up_priority: index % 3 === 0 ? 'High' : index % 3 === 1 ? 'Medium' : 'Low',
        status_after_call: ['Interested', 'Demo Scheduled', 'Negotiation', 'Call Later'][index % 4],
        related_to: index % 2 === 0 ? createdLeads[index]._id : createdCustomers[index]._id,
        related_type: index % 2 === 0 ? 'Lead' : 'Customer',
        activity_date: createDate(-(index + 1)),
        due_date: createDate(index + 1),
        reminder_required: index % 2 === 0,
        reminder_sent: index % 3 === 0,
        created_by: targetUserId,
        created_by_model: 'User',
        assigned_to: allAssignableUsers[(index + 4) % allAssignableUsers.length],
        assigned_to_model: 'User',
        completed_by: index % 2 === 1 ? targetUserId : undefined,
        completed_by_model: index % 2 === 1 ? 'User' : undefined,
        status: index % 3 === 0 ? 'planned' : 'completed',
      })),
      options
    );

    await createMany(
      Note,
      indianProfiles.map((profile, index) => ({
        company_id: companyObjectId,
        type: ['Call', 'Email', 'Meeting', 'WhatsApp'][index % 4],
        subject: `${profile.company} follow-up note`,
        note: `${profile.person} requested a detailed proposal with Indian GST and team hierarchy examples.`,
        related_to: index % 2 === 0 ? createdDeals[index]._id : createdCustomers[index]._id,
        related_type: index % 2 === 0 ? 'Deal' : 'Customer',
        created_by: targetUserId,
        created_by_model: 'User',
        followup_required: index % 2 === 0,
        followup_date: index % 2 === 0 ? createDate(index + 3) : undefined,
      })),
      options
    );

    await createMany(
      LeadNote,
      createdLeads.map((lead, index) => ({
        company_id: companyObjectId,
        lead_id: lead._id,
        user_id: targetUserId,
        user_id_model: 'User',
        note: `${indianProfiles[index].person} wants onboarding in ${indianProfiles[index].city} branch first.`,
        created_at: createDate(-(index + 2)),
      })),
      options
    );

    await createMany(
      CustomerNote,
      createdCustomers.map((customer, index) => ({
        customer_id: customer._id,
        author_id: targetUserId,
        content: `${customer.company_name} prefers monthly review calls and Hindi-English mixed documentation.`,
      })),
      options
    );

    await createMany(
      Notification,
      indianProfiles.map((profile, index) => ({
        company_id: companyObjectId,
        user_id: targetUserId,
        user_id_model: 'User',
        title: index === 0 ? 'Demo workspace ready' : index % 2 === 0 ? 'Lead follow-up scheduled' : 'Payment update available',
        message: index === 0
          ? '10 Indian demo records were added across CRM, finance, support, and HR modules.'
          : index % 2 === 0
            ? `${profile.person} from ${profile.company} is ready for the next conversation.`
            : `Collection status updated for ${profile.company}.`,
        type: index % 3 === 0 ? 'lead' : index % 3 === 1 ? 'deal' : 'success',
        is_read: index % 4 === 0,
        linked_entity_id: index % 2 === 0 ? createdLeads[index]._id : createdDeals[index]._id,
        linked_entity_type: index % 2 === 0 ? 'Lead' : 'Deal',
      })),
      options
    );

    const attendanceUsers = [targetUserId, ...seededUsers.map((item) => item._id)].slice(0, 10);
    await createMany(
      Attendance,
      attendanceUsers.map((employeeId, index) => ({
        company_id: companyObjectId,
        employee_id: employeeId,
        date: createDate(0, 0, 0),
        status: ['Present', 'Present', 'Half Day', 'On Leave', 'Absent'][index % 5],
        check_in: index % 5 === 4 || index % 5 === 3 ? undefined : createDate(0, 9 + (index % 2), 15),
        check_out: index % 5 === 0 ? createDate(0, 18, 20) : index % 5 === 1 ? createDate(0, 17, 45) : undefined,
        working_hours: index % 5 === 0 ? 8.8 : index % 5 === 1 ? 8.2 : index % 5 === 2 ? 4.3 : 0,
        notes: 'Demo attendance record',
      })),
      options
    );

    await createMany(
      LeaveRequest,
      attendanceUsers.map((employeeId, index) => ({
        company_id: companyObjectId,
        employee_id: employeeId,
        type: ['Sick', 'Casual', 'Earned', 'Unpaid'][index % 4],
        start_date: createDate(index + 1),
        end_date: createDate(index + 2),
        days: 2,
        reason: 'Demo leave request for dashboard visibility.',
        status: ['Pending', 'Approved', 'Rejected'][index % 3],
        approved_by: index % 3 === 0 ? undefined : hrUser._id || hrUser,
        hr_notes: index % 3 === 2 ? 'Insufficient balance in demo scenario.' : 'Reviewed by HR.',
      })),
      options
    );

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    await createMany(
      SalarySlip,
      attendanceUsers.map((employeeId, index) => {
        const basic = 38000 + index * 3500;
        const allowances = 8000 + index * 700;
        const deductions = 2500 + index * 300;
        return {
          company_id: companyObjectId,
          employee_id: employeeId,
          month: currentMonth,
          year: currentYear,
          basic_salary: basic,
          allowances,
          deductions,
          net_salary: basic + allowances - deductions,
          status: ['Processed', 'Paid', 'Draft'][index % 3],
          payment_date: index % 3 === 2 ? undefined : createDate(-(index % 4)),
        };
      }),
      options
    );

    await createMany(
      PerformanceReview,
      attendanceUsers.map((employeeId, index) => ({
        company_id: companyObjectId,
        employee_id: employeeId,
        reviewer_id: managerUser._id,
        review_period: 'Q2 2026',
        kpi_goals: 'Pipeline quality, follow-up closure rate, customer responsiveness, and CRM discipline.',
        manager_feedback: index % 3 === 0 ? 'Excellent ownership with Indian region accounts.' : 'Consistent performer with room to improve closure speed.',
        rating: (index % 5) + 1,
        status: ['Completed', 'In Progress', 'Draft'][index % 3],
        recommend_promotion: index % 4 === 0,
      })),
      options
    );

    await createMany(
      CandidateApplication,
      indianProfiles.map((profile, index) => ({
        company_id: companyObjectId,
        job_id: createdJobs[index % createdJobs.length]._id,
        name: `${profile.person} Candidate`,
        email: `candidate.${profile.person.toLowerCase().replace(/\s+/g, '.')}@demo.in`,
        phone: `92030000${String(index + 1).padStart(2, '0')}`,
        resume_url: `https://demo.local/resume/${companyTag}/${index + 1}`,
        status: ['Applied', 'Screening', 'Interview Scheduled', 'Selected', 'Rejected'][index % 5],
        interview_date: index % 5 === 2 ? createDate(index + 2, 14, 0) : undefined,
        feedback: 'Demo candidate profile for HR dashboard.',
        handled_by: hrUser._id || hrUser,
      })),
      options
    );

    for (const customer of createdCustomers) {
      await syncCustomerFinancials(customer._id, companyObjectId, targetUserId);
    }

    for (const deal of createdDeals) {
      await syncDealFinancials(deal._id, companyObjectId);
    }

    console.log(`Demo data successfully seeded for company ${companyObjectId}`);
    console.log(`Created 10 Indian records across CRM, finance, support, and HR flows with ${seededUsers.length} employee users.`);
  } catch (error) {
    console.error('Error seeding demo data:', error);
    throw error;
  }
};

module.exports = { seedDemoData };
