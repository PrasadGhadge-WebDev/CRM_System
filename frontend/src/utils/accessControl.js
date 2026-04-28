export const ROLES = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  ACCOUNTANT: 'Accountant',
  HR: 'HR',
  SALES: 'Sales',
  SUPPORT: 'Support',
  EMPLOYEE: 'Employee',
  CUSTOMER: 'Customer',
}

export const ROLE_GROUPS = {
  allAuthenticated: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT, ROLES.HR, ROLES.SALES, ROLES.SUPPORT, ROLES.EMPLOYEE, ROLES.CUSTOMER],
  admins: [ROLES.ADMIN],
  reportsAccess: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT],
  billingAccess: [ROLES.ADMIN, ROLES.ACCOUNTANT],
  trashAccess: [ROLES.ADMIN, ROLES.MANAGER],
}

export const NAV_ACCESS = {
  customers: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT, ROLES.SUPPORT, ROLES.SALES, ROLES.EMPLOYEE],
  leads: [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES, ROLES.EMPLOYEE],
  deals: [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES, ROLES.EMPLOYEE, ROLES.ACCOUNTANT],
  tickets: [ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPPORT, ROLES.EMPLOYEE, ROLES.CUSTOMER],
  payments: [ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.MANAGER, ROLES.EMPLOYEE, ROLES.CUSTOMER],
  invoices: [ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.MANAGER, ROLES.EMPLOYEE, ROLES.CUSTOMER],
  users: [ROLES.ADMIN, ROLES.HR], 
  reports: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT],
  billing: ROLE_GROUPS.billingAccess,
  trash: ROLE_GROUPS.trashAccess,
  team: [ROLES.ADMIN, ROLES.MANAGER],
  profile: ROLE_GROUPS.allAuthenticated,
  settings: [ROLES.ADMIN],
  attendance: [ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE],
  notifications: ROLE_GROUPS.allAuthenticated,
}

export function hasRequiredRole(userRole, allowedRoles) {
  if (!allowedRoles || allowedRoles.length === 0) return true
  return allowedRoles.includes(userRole)
}

export function hasPermission(user, moduleKey) {
  if (!user) return false
  const normalizedModuleKey = moduleKey.toLowerCase()
  const HR_ALLOWED_MODULES = ['users', 'attendance', 'notifications', 'profile']
  
  // Admins have access to everything
  if (user.role === ROLES.ADMIN) return true

  if (user.role === ROLES.MANAGER && normalizedModuleKey === 'settings') {
    return false
  }

  if (user.role === ROLES.HR && !HR_ALLOWED_MODULES.includes(normalizedModuleKey)) {
    return false
  }

  // Check dynamic permissions from database
  if (user.permissions && Array.isArray(user.permissions)) {
    if (user.permissions.includes(normalizedModuleKey)) return true
  }

  // Fallback to hardcoded rules for default roles
  const allowedRoles = NAV_ACCESS[normalizedModuleKey]
  if (allowedRoles) {
    return allowedRoles.includes(user.role)
  }

  return false
}
