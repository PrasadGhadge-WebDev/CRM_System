import { useState, useEffect } from 'react'
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom'
import { FiEye, FiEyeOff, FiLoader, FiArrowLeft, FiSun, FiMoon } from 'react-icons/fi'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import '../styles/auth-minimal.css'

export default function AuthPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, login, register: registerUser } = useAuth()

  // Toggle state
  const [isRegister, setIsRegister] = useState(location.pathname === '/register')

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

  useEffect(() => {
    setIsRegister(location.pathname === '/register')
    setFieldErrors({}) // Clear errors on toggle
  }, [location.pathname])

  useEffect(() => {
    document.body.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error for this field when corrected
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const validate = () => {
    const errors = {}
    const { name, email, phone, password, confirmPassword } = formData

    // Email validation
    if (!email) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Invalid email format'
    }

    // Password validation
    if (!password) {
      errors.password = 'Password is required'
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }

    if (isRegister) {
      // Name validation
      if (!name) {
        errors.name = 'Name is required'
      } else if (name.length < 2) {
        errors.name = 'Name must be at least 2 characters'
      }

      // Confirm Password
      if (!confirmPassword) {
        errors.confirmPassword = 'Please confirm your password'
      } else if (confirmPassword !== password) {
        errors.confirmPassword = 'Passwords do not match'
      }

      // Phone validation (Optional but if entered must be 10 digits)
      if (phone && !/^\d{10}$/.test(phone)) {
        errors.phone = 'Phone number must be exactly 10 digits'
      }
    }

    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errors = validate()
    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) return

    setLoading(true)
    try {
      if (isRegister) {
        const result = await registerUser({
          fullName: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password
        })
        if (result.success) {
          toast.success('Account created successfully!')
          navigate('/dashboard')
        } else {
          toast.error(result.message || 'Registration failed')
        }
      } else {
        const result = await login(formData.email, formData.password)
        if (result.success) {
          toast.success('Welcome back!')
          navigate('/dashboard')
        } else {
          toast.error(result.message || 'Invalid credentials')
        }
      }
    } catch (err) {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (user) return <Navigate to="/dashboard" replace />

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
            <h1 className="auth-minimal-heading">
              {isRegister ? 'Create your Account' : 'Sign In to your Account'}
            </h1>

            <form onSubmit={handleSubmit} className="auth-minimal-form">
              {isRegister && (
                <>
                  <div className="auth-minimal-group">
                    <label htmlFor="name">Full Name</label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter Full Name"
                      autoComplete="off"
                      className={fieldErrors.name ? 'input-error' : ''}
                    />
                    {fieldErrors.name && <span className="auth-minimal-field-error">{fieldErrors.name}</span>}
                  </div>

                  <div className="auth-minimal-group">
                    <label htmlFor="phone">Phone Number (Optional)</label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Enter 10 Digit Mobile"
                      autoComplete="off"
                      className={fieldErrors.phone ? 'input-error' : ''}
                    />
                    {fieldErrors.phone && <span className="auth-minimal-field-error">{fieldErrors.phone}</span>}
                  </div>
                </>
              )}

              <div className="auth-minimal-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter Email"
                  autoComplete="off"
                  className={fieldErrors.email ? 'input-error' : ''}
                />
                {fieldErrors.email && <span className="auth-minimal-field-error">{fieldErrors.email}</span>}
              </div>

              <div className="auth-minimal-group">
                <label htmlFor="password">Password</label>
                <div className="password-input-wrap">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter Password"
                    autoComplete="new-password"
                    className={fieldErrors.password ? 'input-error' : ''}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {fieldErrors.password && <span className="auth-minimal-field-error">{fieldErrors.password}</span>}
              </div>

              {isRegister && (
                <div className="auth-minimal-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter Password"
                    autoComplete="new-password"
                    className={fieldErrors.confirmPassword ? 'input-error' : ''}
                  />
                  {fieldErrors.confirmPassword && <span className="auth-minimal-field-error">{fieldErrors.confirmPassword}</span>}
                </div>
              )}

              <div className="auth-minimal-options">
                {!isRegister && (
                  <>
                    <label className="checkbox-container">
                      <input type="checkbox" />
                      <span className="checkmark"></span>
                      Remember me
                    </label>
                    <Link to="#" className="forgot-link">Forgot password?</Link>
                  </>
                )}
              </div>

              <button type="submit" disabled={loading} className="auth-minimal-btn">
                {loading ? <FiLoader className="spinner" /> : (isRegister ? 'REGISTER' : 'SIGN IN')}
              </button>

              <p className="auth-minimal-footer">
                {isRegister ? (
                  <>Already have an account? <Link to="/login">Log in</Link></>
                ) : (
                  <>Not registered yet? <Link to="/register">Create an account</Link></>
                )}
              </p>
            </form>
          </div>

          {/* Illustration Side */}
          <div className="auth-minimal-image-section">
            <div className="illustration-wrapper">
              <img src="/minimal_login_illustration.png" alt="Illustration" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
