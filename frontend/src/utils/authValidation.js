const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^\d{10}$/
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/
const FULL_NAME_REGEX = /^[A-Za-z\s'-]+$/

function normalizeText(value) {
  return String(value ?? '').trim()
}

export function validateRegisterField(name, value) {
  const trimmed = normalizeText(value)

  switch (name) {
    case 'fullName':
      if (!trimmed) return 'Full name is required'
      if (trimmed.length < 3) return 'Full name must be at least 3 characters'
      if (!FULL_NAME_REGEX.test(trimmed)) return 'Full name can contain letters only'
      return ''
    case 'email':
      if (!trimmed) return 'Email is required'
      if (!EMAIL_REGEX.test(trimmed.toLowerCase())) return 'Enter a valid email address'
      return ''
    case 'phone':
      if (!trimmed) return 'Phone is required'
      if (!PHONE_REGEX.test(trimmed)) return 'Enter a valid 10-digit mobile number'
      return ''
    case 'password': {
      const password = String(value ?? '')
      if (!password) return 'Password is required'
      if (password.length < 6) return 'Password must be at least 6 characters'
      if (!PASSWORD_REGEX.test(password)) return 'Password must include letters and numbers'
      return ''
    }
    default:
      return ''
  }
}

export function validateLoginForm(values) {
  const errors = {}
  const identifier = normalizeText(values.email || values.username || values.identifier)
  const password = String(values.password ?? '')

  if (!identifier) {
    errors.email = 'Email or Username is required'
  } else if (identifier.includes('@') && !EMAIL_REGEX.test(identifier.toLowerCase())) {
    errors.email = 'Enter a valid email address'
  } else if (!identifier.includes('@') && identifier.length < 3) {
    errors.email = 'Username must be at least 3 characters'
  }

  if (!password) {
    errors.password = 'Password is required'
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters'
  }

  return errors
}

export function validateRegisterForm(values) {
  const errors = {}
  const fields = ['fullName', 'email', 'phone', 'password']

  fields.forEach((field) => {
    const error = validateRegisterField(field, values?.[field])
    if (error) {
      errors[field] = error
    }
  })

  return errors
}
