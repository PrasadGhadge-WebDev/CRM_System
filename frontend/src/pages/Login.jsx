import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  FiAtSign,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
  FiLoader,
  FiLock,
  FiShield,
  FiZap,
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { validateLoginForm } from '../utils/authValidation'
import { useToastFeedback } from '../utils/useToastFeedback.js'
import '../styles/auth.css'

const REMEMBERED_LOGIN_KEY = 'rememberedLoginIdentifier'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  useToastFeedback({ error })

  const fromState = location.state?.from
  const fromPath = typeof fromState === 'string' ? fromState : fromState?.pathname
  const from = fromPath || '/dashboard'
  const entrySource = location.state?.entry

  const handleForgotPassword = () => {
    toast.info('Forgot password? Please contact admin to reset your access.')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const nextErrors = validateLoginForm({ email, password })
    setFieldErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      setError('Please fill all fields')
      return
    }

    setLoading(true)
    try {
      const result = await login(email, password)

      if (result.success) {
        if (rememberMe) {
          localStorage.setItem(REMEMBERED_LOGIN_KEY, email.trim())
        } else {
          localStorage.removeItem(REMEMBERED_LOGIN_KEY)
        }
        toast.success('Logged in successfully')
        navigate(from, { replace: true })
      } else {
        setError(result.message || 'Failed to login')
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="auth-container">
      <div className="auth-shell auth-shell-login">
        <section className="auth-panel auth-panel-brand auth-panel-brand-login">
          <div className="auth-panel-top">
            <div className="auth-logo-wrap">
              <img src="/CRM_Logo.png" alt="CRM Logo" className="auth-brand-logo" />
              <span className="auth-brand-text">CRM SYSTEM</span>
            </div>
            <div className="auth-brand-chip">Workspace Access</div>

            <div className="auth-illustration" aria-hidden="true">
              <div className="auth-illustration-gear" />
              <div className="auth-illustration-window">
                <div className="auth-illustration-screen">
                  <div className="auth-illustration-list">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="auth-illustration-bars">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
              <div className="auth-illustration-card auth-illustration-card-left" />
              <div className="auth-illustration-card auth-illustration-card-right" />
            </div>
          </div>

          <div className="auth-feature-list">
            <div className="auth-feature-item">
              <span className="auth-feature-icon" aria-hidden="true">
                <FiShield />
              </span>
              <div className="auth-feature-content">
                <span className="auth-feature-title">Quick and secure access</span>
                <span className="auth-feature-copy">
                  Sign in to continue managing leads, customers, and account activity.
                </span>
              </div>
            </div>
            <div className="auth-feature-item">
              <span className="auth-feature-icon" aria-hidden="true">
                <FiCheckCircle />
              </span>
              <div className="auth-feature-content">
                <span className="auth-feature-title">Role-based workflow</span>
                <span className="auth-feature-copy">
                  Keep admin actions and day-to-day work separated with controlled access.
                </span>
              </div>
            </div>
            <div className="auth-feature-item">
              <span className="auth-feature-icon" aria-hidden="true">
                <FiZap />
              </span>
              <div className="auth-feature-content">
                <span className="auth-feature-title">Faster daily flow</span>
                <span className="auth-feature-copy">
                  Jump back into deals, notes, tasks, and follow-ups without extra navigation.
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="auth-card auth-card-login">
          <div className="auth-header auth-header-login">
            {entrySource ? <div className="auth-brand-chip">Arrived from {entrySource}</div> : null}
            <h2 className="auth-title">Welcome back</h2>
            <p className="auth-subtitle">
              Sign in to continue your workspace, or launch a demo account to explore the CRM safely.
            </p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form" noValidate autoComplete="off">
            <div className="auth-form-grid">
              <div className="auth-group">
                <label className="auth-label" htmlFor="login-email">
                  Email or Username
                </label>
                <div className={`auth-input-wrap${fieldErrors.email ? ' auth-input-wrap-invalid' : ''}`}>
                  <span className="auth-input-icon" aria-hidden="true">
                    <FiAtSign />
                  </span>
                  <input
                    id="login-email"
                    type="text"
                    value={email}
                    onChange={(e) => {
                      const val = e.target.value
                      setEmail(val)
                      setError('')
                      const errors = validateLoginForm({ email: val, password })
                      setFieldErrors((current) => ({ ...current, email: errors.email || '' }))
                    }}
                    className={`auth-input auth-input-with-icon${fieldErrors.email ? ' auth-input-invalid' : ''}`}
                    placeholder="Enter email or username"
                    autoComplete="off"
                    autoFocus
                  />
                </div>
                {fieldErrors.email && <small className="auth-field-error">{fieldErrors.email}</small>}
              </div>

              <div className="auth-group">
                <label className="auth-label" htmlFor="login-password">
                  Password
                </label>
                <div className={`auth-password-wrap${fieldErrors.password ? ' auth-password-wrap-invalid' : ''}`}>
                  <span className="auth-input-icon" aria-hidden="true">
                    <FiLock />
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      const val = e.target.value
                      setPassword(val)
                      setError('')
                      const errors = validateLoginForm({ email, password: val })
                      setFieldErrors((current) => ({ ...current, password: errors.password || '' }))
                    }}
                    className={`auth-input auth-input-password${fieldErrors.password ? ' auth-input-invalid' : ''}`}
                    placeholder="Password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {fieldErrors.password && <small className="auth-field-error">{fieldErrors.password}</small>}
              </div>
            </div>

            <div className="auth-form-row">
              <label className="auth-check">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember Me</span>
              </label>

              <button type="button" className="auth-inline-action" onClick={handleForgotPassword}>
                Forgot Password?
              </button>
            </div>

            <button type="submit" disabled={loading} className={`auth-button${loading ? ' auth-button-loading' : ''}`}>
              {loading ? (
                <>
                  <FiLoader className="auth-button-spinner" />
                  <span>Logging in...</span>
                </>
              ) : (
                'Log In'
              )}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
