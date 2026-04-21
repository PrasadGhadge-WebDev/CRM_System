const Role = require('../models/Role');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/asyncHandler');

// @desc    Get all roles
// @route   GET /api/roles
// @access  Admin/Manager
exports.getRoles = asyncHandler(async (req, res) => {
  if (!req.user.company_id) {
    return res.fail('User account is not associated with a company. Please contact support.', 400);
  }

  const roles = await Role.find({ company_id: req.user.company_id }).sort({ created_at: -1 });

  // Add assigned user count to each role
  const rolesWithCount = await Promise.all(
    roles.map(async (role) => {
      const userCount = await User.countDocuments({ 
        company_id: req.user.company_id, 
        role: role.name // Assuming we map by role name for now
      });
      const roleObj = role.toObject();
      return { ...roleObj, userCount };
    })
  );

  res.ok(rolesWithCount);
});

// @desc    Create a new role
// @route   POST /api/roles
// @access  Admin
exports.createRole = asyncHandler(async (req, res) => {
  const { name, description, permissions, status } = req.body;

  const existing = await Role.findOne({ 
    company_id: req.user.company_id, 
    name: { $regex: new RegExp(`^${name}$`, 'i') } 
  });

  if (existing) {
    return res.fail('A role with this name already exists', 400);
  }

  if (!req.user.company_id) {
    return res.fail('Unauthorized: Missing company context', 400);
  }

  const role = await Role.create({
    company_id: req.user.company_id,
    name,
    description,
    permissions,
    status: status || 'active'
  });

  res.ok(role, 'Role created successfully');
});

// @desc    Update a role
// @route   PUT /api/roles/:id
// @access  Admin
exports.updateRole = asyncHandler(async (req, res) => {
  const { name, description, permissions, status } = req.body;

  let role = await Role.findById(req.params.id);

  if (!role) {
    return res.fail('Role not found', 404);
  }

  // Prevent editing system roles (optional logic if needed)
  if (role.is_system_role && name && name !== role.name) {
    return res.fail('Standard system roles cannot be renamed', 400);
  }

  // If renaming, check for duplicates
  if (name && name !== role.name) {
    const existing = await Role.findOne({ 
      company_id: req.user.company_id, 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      _id: { $ne: role._id }
    });
    if (existing) {
      return res.fail('Another role already has this name', 400);
    }
  }

  role = await Role.findByIdAndUpdate(
    req.params.id,
    { name, description, permissions, status },
    { new: true, runValidators: false } // Disabled runValidators if it causes 'required' issues for non-updated fields
  );

  res.ok(role, 'Role updated successfully');
});

// @desc    Delete a role
// @route   DELETE /api/roles/:id
// @access  Admin
exports.deleteRole = asyncHandler(async (req, res) => {
  const role = await Role.findById(req.params.id);

  if (!role) {
    return res.fail('Role not found', 404);
  }

  if (role.is_system_role) {
    return res.fail('Core system roles cannot be deleted', 400);
  }

  // Check if assigned to any user
  const userCount = await User.countDocuments({ 
    company_id: req.user.company_id, 
    role: role.name 
  });

  if (userCount > 0) {
    return res.fail(`Cannot delete role: ${userCount} users are currently assigned to it.`, 400);
  }

  await role.deleteOne();
  res.ok(null, 'Role deleted successfully');
});
