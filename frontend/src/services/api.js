import axios from 'axios'

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (import.meta.env.DEV) return ''; // Use Vite proxy via relative URLs

  const { hostname } = window.location;
  return `http://${hostname}:5000`;
};

export const API_BASE_URL = getBaseURL();

export const api = axios.create({
  baseURL: API_BASE_URL,
})

let apiDownUntil = 0
let apiDownBackoffMs = 0

function loadCircuitState() {
  try {
    if (typeof window === 'undefined') return
    const until = Number(sessionStorage.getItem('crm_apiDownUntil') || 0) || 0
    const backoff = Number(sessionStorage.getItem('crm_apiDownBackoffMs') || 0) || 0
    apiDownUntil = until
    apiDownBackoffMs = backoff
  } catch {
    // ignore
  }
}

function persistCircuitState() {
  try {
    if (typeof window === 'undefined') return
    sessionStorage.setItem('crm_apiDownUntil', String(apiDownUntil || 0))
    sessionStorage.setItem('crm_apiDownBackoffMs', String(apiDownBackoffMs || 0))
  } catch {
    // ignore
  }
}

loadCircuitState()

api.interceptors.request.use(
  (config) => {
    if (apiDownUntil && Date.now() < apiDownUntil) {
      const err = new Error('API temporarily unavailable')
      err.code = 'API_DOWN_SUPPRESSED'
      return Promise.reject(err)
    }

    // Sanitize any URLs that might have accidentally appended suffixes like :1
    if (config.url) {
      config.url = config.url.replace(/:\d+$/, '');
    }

    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => {
    const res = response.data
    // If it's our new standardized format, extract data
    if (res && typeof res.success === 'boolean' && Object.prototype.hasOwnProperty.call(res, 'data')) {
      return res.data ?? {}
    }
    // Fallback for non-refactored endpoints
    return res
  },
  (err) => {
    const status = err?.response?.status
    const isGateway = status === 502 || status === 503 || status === 504
    const isNetwork = err?.code === 'ERR_NETWORK' || String(err?.message || '').toLowerCase().includes('network')

    if (isGateway || isNetwork) {
      apiDownBackoffMs = apiDownBackoffMs ? Math.min(120000, apiDownBackoffMs * 2) : 15000
      apiDownUntil = Date.now() + apiDownBackoffMs
      persistCircuitState()
    } else {
      apiDownBackoffMs = 0
      apiDownUntil = 0
      persistCircuitState()
    }

    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/register') &&
        window.location.pathname !== '/'
      ) {
        window.location.href = '/'
      }
    }
    const message =
      err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Request failed'
    // Preserve the original axios response on the error so callers can inspect
    // status codes (e.g. 409 duplicate) and structured response data
    const enhancedError = new Error(message)
    enhancedError.response = err.response
    enhancedError.code = err?.code || undefined
    enhancedError.isGateway = Boolean(isGateway)
    enhancedError.isNetwork = Boolean(isNetwork)
    return Promise.reject(enhancedError)
  },
)
