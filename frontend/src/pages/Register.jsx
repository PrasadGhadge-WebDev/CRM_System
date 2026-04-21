import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiUser, FiMail, FiPhone, FiLock, FiCheckCircle, FiShield, FiZap } from 'react-icons/fi'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { validateRegisterField, validateRegisterForm } from '../utils/authValidation'
import { normalizeDigits, normalizeName } from '../utils/formValidation'
import { useToastFeedback } from '../utils/useToastFeedback.js'
import '../styles/auth.css'

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldError, setFieldError] = useState({})
  const [touched, setTouched] = useState({})
  const [loading, setLoading] = useState(false)

  const { register } = useAuth()
  const navigate = useNavigate()
  useToastFeedback({ error, success })

  const updateFieldError = (name, value) => {
    const nextError = validateRegisterField(name, value)
    setFieldError((current) => {
      const next = { ...current }
      if (nextError) {
        next[name] = nextError
      } else {
        delete next[name]
      }
      return next
    })
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    const nextValue =
      name === 'fullName'
        ? normalizeName(value)
        : name === 'phone'
          ? normalizeDigits(value, 10)
          : value

    const nextFormData = { ...formData, [name]: nextValue }
    setFormData(nextFormData)

    if (touched[name]) {
      updateFieldError(name, nextValue)
    }
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    setTouched((current) => ({ ...current, [name]: true }))
    updateFieldError(name, value)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const errors = validateRegisterForm(formData)
    setFieldError(errors)
    setTouched({
      fullName: true,
      email: true,
      phone: true,
      password: true,
    })

    if (Object.keys(errors).length > 0) {
      toast.error('Please fix the highlighted fields')
      return
    }

    setLoading(true)
    try {
      const result = await register(formData)

      if (result.success) {
        const successMessage = 'Workspace ready! Redirecting to dashboard...'
        setSuccess(successMessage)
        setFormData({
          fullName: '',
          email: '',
          phone: '',
          password: '',
        })
        setTimeout(() => navigate('/dashboard'), 1000)
      } else {
        setError(result.message || 'Failed to register')
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred during registration')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-shell auth-shell-register">
        <section className="auth-panel auth-panel-brand">
          <div className="auth-panel-top">
            <div className="auth-logo-wrap">
              <img src="/CRM_Logo.png" alt="CRM Logo" className="auth-brand-logo" />
              <span className="auth-brand-text">CRM SYSTEM</span>
            </div>
            <div className="auth-brand-chip">Trial Workspace</div>

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
              <span className="auth-feature-title">Start your 5-day free trial</span>
              <span className="auth-feature-copy">
                Get full access to all CRM features immediately after signing up.
              </span>
            </div>
            <div className="auth-feature-item">
              <span className="auth-feature-title">Quick setup</span>
              <span className="auth-feature-copy">
                Enter your basic details to generate your isolated workspace and sample data.
              </span>
            </div>
          </div>
        </section>

        <section className="auth-card auth-card-register">
          <div className="auth-header auth-header-register">
            <h2 className="auth-title">Get Started</h2>
            <p className="auth-subtitle">Create your demo account in seconds.</p>
          </div>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="alert">{success}</div>}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="auth-form-grid">
              <div className="auth-group full-width">
                <label className="auth-label" htmlFor="register-full-name">
                  Name
                </label>
                <div className={`auth-input-wrap${fieldError.fullName ? ' auth-input-wrap-invalid' : ''}`}>
                  <span className="auth-input-icon"><FiUser /></span>
                  <input
                    id="register-full-name"
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`auth-input auth-input-with-icon${fieldError.fullName ? ' auth-input-invalid' : ''}`}
                    placeholder="Your Full Name"
                    autoComplete="name"
                    autoFocus
                    maxLength={60}
                    required
                  />
                </div>
                {fieldError.fullName && (
                  <small className="auth-field-error">{fieldError.fullName}</small>
                )}
              </div>

              <div className="auth-group full-width">
                <label className="auth-label" htmlFor="register-email">
                  Email
                </label>
                <div className={`auth-input-wrap${fieldError.email ? ' auth-input-wrap-invalid' : ''}`}>
                  <span className="auth-input-icon"><FiMail /></span>
                  <input
                    id="register-email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`auth-input auth-input-with-icon${fieldError.email ? ' auth-input-invalid' : ''}`}
                    placeholder="example@email.com"
                    autoComplete="email"
                    maxLength={100}
                    required
                  />
                </div>
                {fieldError.email && (
                  <small className="auth-field-error">{fieldError.email}</small>
                )}
              </div>

              <div className="auth-group full-width">
                <label className="auth-label" htmlFor="register-phone">
                  Mobile
                </label>
                <div className={`auth-input-wrap${fieldError.phone ? ' auth-input-wrap-invalid' : ''}`}>
                  <span className="auth-input-icon"><FiPhone /></span>
                  <input
                    id="register-phone"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`auth-input auth-input-with-icon${fieldError.phone ? ' auth-input-invalid' : ''}`}
                    placeholder="10-digit mobile number"
                    inputMode="numeric"
                    maxLength={10}
                    autoComplete="tel"
                    required
                  />
                </div>
                {fieldError.phone && (
                  <small className="auth-field-error">{fieldError.phone}</small>
                )}
              </div>

              <div className="auth-group full-width">
                <label className="auth-label" htmlFor="register-password">
                  Password
                </label>
                <div className={`auth-password-wrap${fieldError.password ? ' auth-password-wrap-invalid' : ''}`}>
                  <span className="auth-input-icon"><FiLock /></span>
                  <input
                    id="register-password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`auth-input auth-input-password${fieldError.password ? ' auth-input-invalid' : ''}`}
                    placeholder="Choose a password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                </div>
                {fieldError.password && (
                  <small className="auth-field-error">{fieldError.password}</small>
                )}
                <small className="auth-field-hint">
                  Use at least 6 characters with letters and numbers.
                </small>
              </div>
            </div>

            <button type="submit" disabled={loading} className="auth-button">
              {loading ? 'Setting up workspace...' : 'Start Free Demo'}
            </button>
          </form>

          <div className="auth-footer">
            Already have an account?
            <Link
              to="/login"
              state={{ from: { pathname: '/dashboard' }, entry: 'register' }}
              className="auth-link"
            >
              Log in
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
