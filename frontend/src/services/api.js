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

api.interceptors.request.use(
  (config) => {
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
      return res.data
    }
    // Fallback for non-refactored endpoints
    return res
  },
  (err) => {
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
    return Promise.reject(enhancedError)
  },
)
