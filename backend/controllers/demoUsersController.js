const mongoose = require('mongoose');
const DemoUser = require('../models/DemoUser');
const User = require('../models/User');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Deal = require('../models/Deal');
const Activity = require('../models/Activity');
const Note = require('../models/Note');
const SupportTicket = require('../models/SupportTicket');
const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/asyncHandler');
const { moveDocumentToTrash } = require('../utils/trash');

// @desc    Get all demo users
// @route   GET /api/demo-users
// @access  Private/Admin
exports.listDemoUsers = asyncHandler(async (req, res) => {
  const { q, page = 1, limit = 20, sortField = 'created_at', sortOrder = 'desc' } = req.query;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const sort = { [sortField]: sortOrder === 'desc' ? -1 : 1 };

  const filter = {};
  filter.company_id = req.user.company_id;
  
  if (q) {
    const search = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    filter.$or = [{ name: search }, { username: search }, { email: search }];
  }

  const [items, total] = await Promise.all([
    DemoUser.find(filter)
      .sort(sort)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    DemoUser.countDocuments(filter)
  ]);

  res.ok({ items, page: pageNum, limit: limitNum, total });
});

// @desc    Get single demo user
// @route   GET /api/demo-users/:id
// @access  Private/Admin
exports.getDemoUser = asyncHandler(async (req, res) => {
  const user = await DemoUser.findOne({ 
    _id: req.params.id, 
    company_id: req.user.company_id 
  });

  if (!user) {
    return res.fail('Demo user not found', 404);
  }

  res.ok(user);
});

// @desc    Delete demo user
// @route   DELETE /api/demo-users/:id
// @access  Private/Admin
exports.deleteDemoUser = asyncHandler(async (req, res) => {
  const user = await DemoUser.findOne({ 
    _id: req.params.id, 
    company_id: req.user.company_id 
  });

  if (!user) {
    return res.fail('Demo user not found', 404);
  }

  await moveDocumentToTrash({ 
    entityType: 'DemoUser', 
    document: user, 
    deletedBy: req.user?.id 
  });

  res.ok(null, 'Demo user moved to trash');
});

// @desc    Convert demo user to real user
// @route   POST /api/demo-users/:id/convert
// @access  Private/Admin
exports.convertToUser = asyncHandler(async (req, res) => {
  const demoUser = await DemoUser.findOne({ 
    _id: req.params.id, 
    company_id: req.user.company_id 
  }).select('+password');

  if (!demoUser) {
    return res.fail('Demo user not found', 404);
  }

  // 1. Check if user already exists in users collection (shouldn't happen with our uniqueness checks but safe)
  const existingUser = await User.findOne({ email: demoUser.email });
  if (existingUser) {
    return res.fail('A real user with this email already exists', 400);
  }

  // 2. Create the real user with the same ID
  const userData = demoUser.toObject();
  delete userData._id;
  delete userData.id;
  userData.is_demo = false;
  userData.status = 'active'; // Ensure active upon conversion

  const newUser = await User.create({
    _id: demoUser._id,
    ...userData,
  });

  // 3. Update Polymorphic References
  const userId = demoUser._id;
  
  await Promise.all([
    // Lead
    Lead.updateMany({ assignedTo: userId, assignedToModel: 'DemoUser' }, { assignedToModel: 'User' }),
    Lead.updateMany({ createdBy: userId, createdByModel: 'DemoUser' }, { createdByModel: 'User' }),
    
    // Customer
    Customer.updateMany({ assigned_to: userId, assigned_to_model: 'DemoUser' }, { assigned_to_model: 'User' }),
    
    // Deal
    Deal.updateMany({ assigned_to: userId, assigned_to_model: 'DemoUser' }, { assigned_to_model: 'User' }),
    
    // Activity
    Activity.updateMany({ created_by: userId, created_by_model: 'DemoUser' }, { created_by_model: 'User' }),
    Activity.updateMany({ assigned_to: userId, assigned_to_model: 'DemoUser' }, { assigned_to_model: 'User' }),
    Activity.updateMany({ completed_by: userId, completed_by_model: 'DemoUser' }, { completed_by_model: 'User' }),
    
    // Note
    Note.updateMany({ created_by: userId, created_by_model: 'DemoUser' }, { created_by_model: 'User' }),
    
    // SupportTicket
    SupportTicket.updateMany({ assigned_to: userId, assigned_to_model: 'DemoUser' }, { assigned_to_model: 'User' }),
    
    // Notification
    Notification.updateMany({ user_id: userId, user_id_model: 'DemoUser' }, { user_id_model: 'User' })
  ]);

  // 4. Delete from demo_users
  await DemoUser.deleteOne({ _id: userId });

  res.ok(newUser, 'User converted successfully');
});
