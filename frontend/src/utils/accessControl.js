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
  dashboard: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT, ROLES.HR, ROLES.EMPLOYEE],
  users: [ROLES.ADMIN],
  roles: [],
  employees: [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER],
  leads: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE],
  deals: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE, ROLES.ACCOUNTANT],
  customers: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE, ROLES.ACCOUNTANT],
  activities: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE, ROLES.HR],
  teamPerformance: [ROLES.ADMIN, ROLES.MANAGER],
  attendance: [ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE],
  leaves: [ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE],
  payroll: [ROLES.ADMIN, ROLES.HR],
  hr: [ROLES.ADMIN, ROLES.HR],
  recruitment: [ROLES.ADMIN, ROLES.HR],
  onboarding: [ROLES.ADMIN, ROLES.HR],
  performance: [ROLES.ADMIN, ROLES.HR],
  training: [ROLES.ADMIN, ROLES.HR],
  hrdocs: [ROLES.ADMIN, ROLES.HR],
  exitmgmt: [ROLES.ADMIN, ROLES.HR],
  invoices: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT],
  payments: [ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.EMPLOYEE],
  expenses: [ROLES.ADMIN, ROLES.ACCOUNTANT],
  tickets: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE],
  reports: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT, ROLES.HR],
  notifications: [ROLES.ADMIN, ROLES.EMPLOYEE],
  settings: [ROLES.ADMIN],
  trash: [ROLES.ADMIN, ROLES.MANAGER],
  profile: ROLE_GROUPS.allAuthenticated,
}

const PERMISSION_ALIASES = {
  support: 'tickets',
  contacts: 'customers',
  manageusers: 'users',
  accesssettings: 'settings',
}

function normalizePermissionToken(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
}

function expandPermissionKeys(permission) {
  const raw = String(permission ?? '').trim()
  if (!raw) return []

  const normalized = normalizePermissionToken(raw)
  const keys = new Set([normalized])

  const parts = raw
    .toLowerCase()
    .split('.')
    .map(part => normalizePermissionToken(part))
    .filter(Boolean)

  parts.forEach(part => keys.add(part))

  if (parts.length >= 2) {
    keys.add(`${parts[0]}.${parts[1]}`)
  }

  const words = raw
    .toLowerCase()
    .split(/[^a-z]+/)
    .map(word => normalizePermissionToken(word))
    .filter(Boolean)

  words.forEach(word => keys.add(word))

  if (words.length >= 2) {
    keys.add(words[words.length - 1])
    keys.add(words.slice(-2).join(''))
  }

  return [...keys].map(key => PERMISSION_ALIASES[key] || key)
}

export function hasRequiredRole(userRole, allowedRoles) {
  if (!allowedRoles || allowedRoles.length === 0) return true
  return allowedRoles.includes(userRole)
}

export function hasPermission(user, moduleKey) {
  if (!user) return false
  const normalizedModuleKey = normalizePermissionToken(moduleKey)
  
  // Check dynamic permissions from database if they exist
  if (user.permissions && Array.isArray(user.permissions)) {
    const grantedKeys = new Set(
      user.permissions.flatMap(permission => expandPermissionKeys(permission))
    )

    if (grantedKeys.has(normalizedModuleKey)) return true
  }

  // Admins have full access to everything
  if (user.role === ROLES.ADMIN) return true

  // Check against NAV_ACCESS mapping for other roles or as fallback
  const allowedRoles = NAV_ACCESS[normalizedModuleKey]
  if (allowedRoles) {
    return allowedRoles.includes(user.role)
  }

  return false
}
