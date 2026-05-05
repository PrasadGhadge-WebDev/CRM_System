export const ROLES = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  ACCOUNTANT: 'Accountant',
  HR: 'HR',
  EMPLOYEE: 'Employee',
  SALES: 'Sales', // Legacy or subset
  SUPPORT: 'Support', // Legacy or subset
  CUSTOMER: 'Customer',
}

export const ROLE_GROUPS = {
  allAuthenticated: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT, ROLES.HR, ROLES.EMPLOYEE, ROLES.SALES, ROLES.SUPPORT, ROLES.CUSTOMER],
  admins: [ROLES.ADMIN],
  staff: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE],
}

export const NAV_ACCESS = {
  dashboard: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE, ROLES.ACCOUNTANT, ROLES.HR],
  users: [ROLES.ADMIN],
  roles: [],
  employees: [ROLES.HR],
  leads: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE],
  deals: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE],
  customers: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE, ROLES.ACCOUNTANT],
  activities: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE],
  teamPerformance: [ROLES.ADMIN, ROLES.MANAGER],
  attendance: [ROLES.ADMIN, ROLES.HR],
  leaves: [ROLES.ADMIN, ROLES.HR],
  payroll: [ROLES.ADMIN, ROLES.HR],
  invoices: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT],
  payments: [ROLES.ADMIN, ROLES.ACCOUNTANT],
  expenses: [ROLES.ADMIN, ROLES.ACCOUNTANT],
  tickets: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE],
  reports: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT, ROLES.HR],
  notifications: [ROLES.ADMIN],
  settings: [ROLES.ADMIN],
  trash: [ROLES.ADMIN, ROLES.MANAGER],
  tasks: [ROLES.EMPLOYEE],
  profile: ROLE_GROUPS.allAuthenticated,
}

export function hasRequiredRole(userRole, allowedRoles) {
  if (!allowedRoles || allowedRoles.length === 0) return true
  return allowedRoles.includes(userRole)
}

export function hasPermission(user, moduleKey) {
  if (!user) return false
  const normalizedModuleKey = moduleKey.toLowerCase()
  
  // Check dynamic permissions from database if they exist
  if (user.permissions && Array.isArray(user.permissions)) {
    if (user.permissions.includes(normalizedModuleKey)) return true
    
    // If user is Admin, we might want to still allow everything UNLESS we want to be strict.
    // The user's request: "if Exits in system and not exsit in my lsit the remove"
    // This implies strictness.
    if (user.role === ROLES.ADMIN) {
        // However, some core things like profile should always be accessible
        if (['profile', 'dashboard'].includes(normalizedModuleKey)) return true
        
        // Check if the permission exists in the database list. 
        // If the database list exists but doesn't have it, we return false.
        return false
    }
  }

  // Fallback for Admins if no explicit database permissions are found
  if (user.role === ROLES.ADMIN) return true

  // Check against NAV_ACCESS mapping for other roles or as fallback
  const allowedRoles = NAV_ACCESS[normalizedModuleKey]
  if (allowedRoles) {
    return allowedRoles.includes(user.role)
  }

  return false
}

