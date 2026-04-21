export const DEFAULT_CUSTOMER_SORT = {
  field: 'created_at',
  order: 'desc',
}

const EDITABLE_CUSTOMER_FIELDS = [
  'customer_id', 
  'name', 
  'company_name', 
  'gst_number', 
  'email', 
  'phone', 
  'address', 
  'city', 
  'status', 
  'assigned_to', 
  'total_purchase_amount', 
  'payment_status', 
  'satisfaction_score', 
  'manager_notes', 
  'last_review_date', 
  'is_vip'
]

export const STATIC_CUSTOMER_TYPES = [
  { value: 'Corporate', label: 'Corporate' },
  { value: 'Individual', label: 'Individual' },
  { value: 'Retail', label: 'Retail' },
]

export const emptyCustomer = {
  customer_id: '',
  name: '',
  company_name: '',
  gst_number: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  status: 'Active',
  assigned_to: '',
  total_purchase_amount: 0,
  payment_status: 'Pending',
  satisfaction_score: 5,
  manager_notes: '',
  last_review_date: null,
  is_vip: false,
}

export function buildCustomerLocation(customer = {}) {
  return [customer.city, customer.state, customer.country].filter(Boolean).join(', ')
}

export function stopRowNavigation(event) {
  event.stopPropagation()
}

export function sanitizeCustomerPayload(model = {}) {
  const payload = Object.fromEntries(
    EDITABLE_CUSTOMER_FIELDS.map((key) => [key, model[key] ?? '']),
  )

  Object.keys(payload).forEach((key) => {
    if (typeof payload[key] === 'string') {
      payload[key] = payload[key].trim()
    }
  })

  return payload
}
