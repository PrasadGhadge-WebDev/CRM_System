export function normalizeDigits(value, maxLength = 10) {
  return String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, maxLength)
}

export function normalizeName(value) {
  return String(value ?? '').replace(/[^A-Za-z\s'-]/g, '')
}

export function isValidEmail(value) {
  if (!value) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())
}

export function isValidUrl(value) {
  if (!value) return true
  try {
    const candidate = String(value).trim()
    const normalized = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`
    new URL(normalized)
    return true
  } catch {
    return false
  }
}

export function validateRequired(label, value) {
  if (!String(value ?? '').trim()) return `${label} is required`
  return ''
}

export function validateName(label, value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return ''
  if (!/^[A-Za-z\s'-]+$/.test(trimmed)) return `${label} can contain letters only`
  return ''
}

export function validateEmail(label, value) {
  if (!value) return ''
  if (!isValidEmail(value)) return `Enter a valid ${label.toLowerCase()}`
  return ''
}

export function validatePhone(label, value, { required = false, maxLength = 10 } = {}) {
  const normalized = normalizeDigits(value, maxLength)
  if (!normalized) {
    return required ? `${label} is required` : ''
  }
  if (normalized.length > maxLength) {
    return `${label} must be at most ${maxLength} digits`
  }
  if (String(value ?? '').replace(/\D/g, '').length !== String(value ?? '').trim().length) {
    return `${label} must contain digits only`
  }
  return ''
}

export function validateNonNegativeNumber(label, value) {
  if (value === '' || value === null || value === undefined) return ''
  const number = Number(value)
  if (Number.isNaN(number)) return `${label} must be a valid number`
  if (number < 0) return `${label} cannot be negative`
  return ''
}
