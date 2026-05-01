import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiUser, FiMail, FiPhone, FiLock, FiLoader, FiArrowLeft, FiSun, FiMoon } from 'react-icons/fi'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { validateRegisterField, validateRegisterForm } from '../utils/authValidation'
import { normalizeDigits, normalizeName } from '../utils/formValidation'
import { useToastFeedback } from '../utils/useToastFeedback.js'
import '../styles/auth-minimal.css'

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState({})
  const [touched, setTouched] = useState({})
  const [loading, setLoading] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

  const { register } = useAuth()
  const navigate = useNavigate()
  useToastFeedback({ error })

  useEffect(() => {
    document.body.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

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
        toast.success('Registration successful!')
        setTimeout(() => navigate('/dashboard'), 1500)
      } else {
        setError(result.message || 'Failed to register')
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-minimal-page">
      <div className="auth-minimal-container">
        <div className="auth-minimal-card">
          <div className="auth-minimal-controls">
            <Link to="/" className="back-btn" title="Back to Home">
              <FiArrowLeft />
            </Link>
            <button className="theme-toggle" onClick={toggleTheme} title="Toggle Theme">
              {theme === 'dark' ? <FiSun /> : <FiMoon />}
            </button>
          </div>

          {/* Form Side */}
          <div className="auth-minimal-form-section">
            <h1 className="auth-minimal-heading">Create your Account</h1>
            
            {error && <div className="auth-minimal-error">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-minimal-form">
              <div className="auth-minimal-group">
                <label htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Enter Name"
                  autoComplete="off"
                  className={fieldError.fullName ? 'input-error' : ''}
                />
                {fieldError.fullName && <span className="auth-minimal-field-error">{fieldError.fullName}</span>}
              </div>

              <div className="auth-minimal-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Enter Email"
                  autoComplete="off"
                  className={fieldError.email ? 'input-error' : ''}
                />
                {fieldError.email && <span className="auth-minimal-field-error">{fieldError.email}</span>}
              </div>

              <div className="auth-minimal-group">
                <label htmlFor="phone">Mobile Number</label>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Enter Mobile"
                  autoComplete="off"
                  className={fieldError.phone ? 'input-error' : ''}
                />
                {fieldError.phone && <span className="auth-minimal-field-error">{fieldError.phone}</span>}
              </div>

              <div className="auth-minimal-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Choose Password"
                  autoComplete="new-password"
                  className={fieldError.password ? 'input-error' : ''}
                />
                {fieldError.password && <span className="auth-minimal-field-error">{fieldError.password}</span>}
              </div>

              <button type="submit" disabled={loading} className="auth-minimal-btn">
                {loading ? <FiLoader className="spinner" /> : 'START FREE DEMO'}
              </button>

              <p className="auth-minimal-footer">
                Already have an account? <Link to="/login">Log in</Link>
              </p>
            </form>
          </div>

          {/* Illustration Side */}
          <div className="auth-minimal-image-section">
            <div className="illustration-wrapper">
              <img src="/minimal_login_illustration.png" alt="Illustration" />
            </div>
            <div className="illustration-circle-bg"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
