import { useState, useEffect } from 'react'
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom'
import { 
  FiEye, 
  FiEyeOff, 
  FiLoader, 
  FiArrowLeft, 
  FiSun, 
  FiMoon, 
  FiMail, 
  FiLock, 
  FiUser, 
  FiPhone,
  FiChevronDown
} from 'react-icons/fi'
import { toast } from 'react-toastify'
import PasswordInput from '../components/PasswordInput.jsx'
import { useAuth } from '../context/AuthContext'
import { validateLoginForm, validateRegisterForm, validateRegisterField, validateLoginField } from '../utils/authValidation'
import { normalizeDigits, normalizeName, normalizeEmail } from '../utils/formValidation'
import '../styles/auth-minimal.css'
import '../styles/forms-premium.css'

export default function AuthPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, login, register: registerUser } = useAuth()

  // Toggle state
  const [isRegister, setIsRegister] = useState(location.pathname === '/register')

  // Form states
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'Admin'
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

  useEffect(() => {
    setIsRegister(location.pathname === '/register')
    setFieldErrors({}) // Clear errors on toggle
    setTouched({}) // Clear touched on toggle
  }, [location.pathname])

  useEffect(() => {
    document.body.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  const updateFieldError = (name, value) => {
    let error = ''
    if (isRegister) {
      error = validateRegisterField(name, value)
      if (name === 'confirmPassword' && !error) {
        if (value !== formData.password) {
          error = 'Passwords do not match'
        }
      }
    } else {
      error = validateLoginField(name, value)
    }

    setFieldErrors(prev => {
      const next = { ...prev }
      if (error) next[name] = error
      else delete next[name]
      return next
    })
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    let nextValue = value

    if (name === 'email') nextValue = normalizeEmail(value)

    if (isRegister) {
      if (name === 'fullName') nextValue = normalizeName(value)
      if (name === 'phone') nextValue = normalizeDigits(value, 10)
    }

    setFormData(prev => ({ ...prev, [name]: nextValue }))

    if (touched[name]) {
      updateFieldError(name, nextValue)
    }
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
    updateFieldError(name, value)
  }

  const validate = () => {
    if (isRegister) {
      const errors = validateRegisterForm(formData)
      if (formData.confirmPassword !== formData.password) {
        errors.confirmPassword = 'Passwords do not match'
      }
      return errors
    } else {
      return validateLoginForm(formData)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errors = validate()
    setFieldErrors(errors)
    setTouched({
      fullName: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true
    })

    if (Object.keys(errors).length > 0) {
      toast.error('Please correct the errors in the form')
      return
    }

    setLoading(true)
    try {
      if (isRegister) {
        const result = await registerUser({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          role: formData.role
        })
        if (result.success) {
          toast.success('Account created successfully!')
          navigate('/dashboard')
        } else {
          toast.error(result.message || 'Registration failed')
        }
      } else {
        const result = await login(formData.email, formData.password, formData.role)
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
                    <label htmlFor="fullName">Full Name</label>
                    <div className={`crm-input-group ${fieldErrors.fullName ? 'error' : ''}`}>
                      <div className="input-icon-box"><FiUser /></div>
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        value={formData.fullName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter Full Name"
                        autoComplete="off"
                      />
                    </div>
                    {fieldErrors.fullName && <span className="auth-minimal-field-error">{fieldErrors.fullName}</span>}
                  </div>

                  <div className="auth-minimal-group">
                    <label htmlFor="phone">Phone Number</label>
                    <div className={`crm-input-group ${fieldErrors.phone ? 'error' : ''}`}>
                      <div className="input-icon-box"><FiPhone /></div>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter 10 Digit Mobile"
                        autoComplete="off"
                      />
                    </div>
                    {fieldErrors.phone && <span className="auth-minimal-field-error">{fieldErrors.phone}</span>}
                  </div>
                </>
              )}

              <div className="auth-minimal-group">
                <label htmlFor="role">Login Role</label>
                <div className="crm-input-group">
                  <div className="input-icon-box"><FiLock /></div>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="auth-minimal-select"
                  >
                    <option value="Admin">Administrator</option>
                    <option value="Manager">Manager</option>
                    <option value="Employee">Employee</option>
                    <option value="Accountant">Accountant</option>
                    <option value="HR">HR Specialist</option>
                  </select>
                  <div className="select-chevron-box"><FiChevronDown /></div>
                </div>
              </div>

              <div className="auth-minimal-group">
                <label htmlFor="email">Email Address</label>
                <div className={`crm-input-group ${fieldErrors.email ? 'error' : ''}`}>
                  <div className="input-icon-box"><FiMail /></div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Enter Email"
                    autoComplete="off"
                  />
                </div>
                {fieldErrors.email && <span className="auth-minimal-field-error">{fieldErrors.email}</span>}
              </div>

              <PasswordInput
                id="password"
                name="password"
                label="Password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter Password"
                error={fieldErrors.password}
                wrapperClass="auth-minimal-group"
              />

              {isRegister && (
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  label="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Re-enter Password"
                  error={fieldErrors.confirmPassword}
                  wrapperClass="auth-minimal-group"
                />
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
