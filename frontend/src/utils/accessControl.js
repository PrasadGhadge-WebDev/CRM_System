export const ROLES = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  ACCOUNTANT: 'Accountant',
  SALES: 'Sales',
  SUPPORT: 'Support',
  EMPLOYEE: 'Employee',
}

export const ROLE_GROUPS = {
  allAuthenticated: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT, ROLES.SALES, ROLES.SUPPORT, ROLES.EMPLOYEE],
  admins: [ROLES.ADMIN],
  reportsAccess: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT],
  tasksAccess: [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES, ROLES.EMPLOYEE],
  followupsAccess: [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES, ROLES.EMPLOYEE],
  billingAccess: [ROLES.ADMIN, ROLES.ACCOUNTANT],
  trashAccess: [ROLES.ADMIN, ROLES.MANAGER],
}

export const NAV_ACCESS = {
  customers: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT, ROLES.SUPPORT, ROLES.SALES, ROLES.EMPLOYEE],
  leads: [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES, ROLES.EMPLOYEE],
  deals: [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES, ROLES.ACCOUNTANT],
  tickets: [ROLES.MANAGER, ROLES.SUPPORT, ROLES.ACCOUNTANT, ROLES.EMPLOYEE],
  users: ROLE_GROUPS.admins,
  reports: ROLE_GROUPS.reportsAccess,
  tasks: ROLE_GROUPS.tasksAccess,
  followups: ROLE_GROUPS.followupsAccess,
  billing: ROLE_GROUPS.billingAccess,
  trash: ROLE_GROUPS.trashAccess,
  team: [ROLES.ADMIN, ROLES.MANAGER],
  profile: ROLE_GROUPS.allAuthenticated,
  settings: [ROLES.ADMIN, ROLES.MANAGER], 
  notifications: ROLE_GROUPS.allAuthenticated,
}

export function hasRequiredRole(userRole, allowedRoles) {
  if (!allowedRoles || allowedRoles.length === 0) return true
  return allowedRoles.includes(userRole)
}

export function hasPermission(user, moduleKey) {
  if (!user) return false
  
  // Admins have access to everything
  if (user.role === ROLES.ADMIN) return true

  // Check dynamic permissions from database
  if (user.permissions && Array.isArray(user.permissions)) {
    if (user.permissions.includes(moduleKey.toLowerCase())) return true
  }

  // Fallback to hardcoded rules for default roles
  const allowedRoles = NAV_ACCESS[moduleKey.toLowerCase()]
  if (allowedRoles) {
    return allowedRoles.includes(user.role)
  }

  return false
}
