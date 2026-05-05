const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Role = require('../models/Role');
const Company = require('../models/Company');

dotenv.config({ path: path.join(__dirname, '../.env') });

const rolePermissionsMapping = {
  'Admin': [
    'dashboard', 'users', 'leads', 'deals', 'customers', 
    'activities', 'teamPerformance', 'attendance', 'leaves', 'payroll', 
    'invoices', 'payments', 'expenses', 'tickets', 'reports', 'notifications', 
    'settings', 'trash'
  ],
  'Manager': [
    'dashboard', 'leads', 'deals', 'customers', 'activities', 
    'teamPerformance', 'invoices', 'tickets', 'reports', 'trash'
  ],
  'Employee': [
    'dashboard', 'leads', 'deals', 'customers', 'activities', 'tasks', 'tickets'
  ],
  'Accountant': [
    'dashboard', 'customers', 'invoices', 'payments', 'expenses', 'reports'
  ],
  'HR': [
    'dashboard', 'employees', 'attendance', 'leaves', 'payroll', 'reports'
  ]
};

async function syncRoles() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) throw new Error('MONGO_URI is not defined in environment');
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB...');

    // Get all companies to sync roles for each (or at least the main one)
    // The user's request sounds like a system-wide update for these standard roles.
    const companies = await Company.find({});
    
    for (const company of companies) {
      console.log(`Syncing roles for company: ${company.company_name} (${company._id})`);
      
      for (const [roleName, permissions] of Object.entries(rolePermissionsMapping)) {
        let role = await Role.findOne({ 
          company_id: company._id, 
          name: roleName 
        });

        if (!role) {
          console.log(`Role "${roleName}" not found for company ${company.company_name}. Creating...`);
          role = new Role({
            company_id: company._id,
            name: roleName,
            description: `${roleName} role with standard permissions`,
            permissions: permissions,
            is_system_role: true
          });
          await role.save();
          console.log(`Created role "${roleName}" with ${permissions.length} permissions.`);
        } else {
          console.log(`Updating role "${roleName}" permissions...`);
          // "Check All Module If Not Exist in Role Then Add and if Exits in system and not exsit in my lsit the remove"
          // This essentially means setting the permissions to my mapping.
          role.permissions = permissions;
          await role.save();
          console.log(`Updated role "${roleName}" with ${permissions.length} permissions.`);
        }
      }
    }

    console.log('Role synchronization complete.');
    process.exit(0);
  } catch (error) {
    console.error('Sync error:', error);
    process.exit(1);
  }
}

syncRoles();
