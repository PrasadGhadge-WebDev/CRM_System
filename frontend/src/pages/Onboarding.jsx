import { useNavigate, Link } from 'react-router-dom'
import { FiUser, FiMail, FiPhone, FiLock, FiCheckCircle, FiShield, FiArrowRight, FiArrowLeft, FiCircle } from 'react-icons/fi'
import { toast } from 'react-toastify'
import { authApi } from '../services/auth'
import '../styles/auth.css'

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1 Fields
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  })

  // Step 2 Fields
  const [details, setDetails] = useState({
    userId: '',
    name: '',
    email: '',
    phone: '',
  })

  const onCredentialsChange = (e) => {
    setCredentials((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const onDetailsChange = (e) => {
    setDetails((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await authApi.verifyOnboarding(credentials)
      setDetails((prev) => ({ ...prev, userId: res.userId }))
      setStep(2)
      toast.success('Credentials verified! Please fill in your details.')
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await authApi.completeOnboarding(details)
      toast.success('Profile completed successfully! You can now login.')
      navigate('/login')
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to complete profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="mesh-background"></div>
      
      <div className="auth-shell auth-shell-onboarding">
        <section className="auth-panel auth-panel-brand">
          <div className="auth-panel-top">
            <div className="auth-brand-chip">Employee Portal</div>
            <div className="auth-illustration">
              <FiUser style={{ fontSize: '80px', opacity: 0.2 }} />
            </div>
          </div>

          <div className="onboarding-steps">
            <div className={`onboarding-step-item ${step >= 1 ? 'active' : ''}`}>
              <span className="step-number">{step > 1 ? <FiCheckCircle /> : '1'}</span>
              <div className="step-content">
                <span className="step-title">Verify Access</span>
                <span className="step-desc">Enter your provided ID</span>
              </div>
            </div>
            <div className={`onboarding-step-item ${step >= 2 ? 'active' : ''}`}>
              <span className="step-number">2</span>
              <div className="step-content">
                <span className="step-title">Personalize</span>
                <span className="step-desc">Complete your profile</span>
              </div>
            </div>
          </div>

          <div className="auth-feature-list">
            <div className="auth-feature-item">
              <FiShield className="auth-feature-icon" />
              <div className="auth-feature-content">
                <span className="auth-feature-title">Secure onboarding</span>
                <span className="auth-feature-copy">Access is restricted to authorized employees only.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-header">
            <h2 className="auth-title">
              {step === 1 ? 'Welcome Aboard' : 'Tell us about yourself'}
            </h2>
            <p className="auth-subtitle">
              {step === 1 
                ? 'Enter your Login ID and Password provided by your administrator.' 
                : 'Please complete your profile details to finalize your access.'}
            </p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          {step === 1 ? (
            <form className="auth-form" onSubmit={handleVerify}>
              <div className="auth-group">
                <label className="auth-label">Login ID (Username)</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon"><FiUser /></span>
                  <input
                    type="text"
                    name="username"
                    className="auth-input auth-input-with-icon"
                    required
                    placeholder="e.g. johndoe"
                    value={credentials.username}
                    onChange={onCredentialsChange}
                  />
                </div>
              </div>
              <div className="auth-group">
                <label className="auth-label">Password</label>
                <div className="auth-password-wrap">
                  <span className="auth-input-icon"><FiLock /></span>
                  <input
                    type="password"
                    name="password"
                    className="auth-input auth-input-password"
                    required
                    placeholder="Enter your temp password"
                    value={credentials.password}
                    onChange={onCredentialsChange}
                  />
                </div>
              </div>
              <button className="auth-button" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify & Continue'}
                {!loading && <FiArrowRight />}
              </button>
              <div className="auth-footer">
                Already have a complete profile? <Link to="/login" className="auth-link">Log in</Link>
              </div>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleComplete}>
              <div className="auth-group">
                <label className="auth-label">Full Name</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon"><FiUser /></span>
                  <input
                    type="text"
                    name="name"
                    className="auth-input auth-input-with-icon"
                    required
                    placeholder="Your legal name"
                    value={details.name}
                    onChange={onDetailsChange}
                  />
                </div>
              </div>
              <div className="auth-group">
                <label className="auth-label">Email Address</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon"><FiMail /></span>
                  <input
                    type="email"
                    name="email"
                    className="auth-input auth-input-with-icon"
                    required
                    placeholder="work-email@company.com"
                    value={details.email}
                    onChange={onDetailsChange}
                  />
                </div>
              </div>
              <div className="auth-group">
                <label className="auth-label">Phone Number</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon"><FiPhone /></span>
                  <input
                    type="tel"
                    name="phone"
                    className="auth-input auth-input-with-icon"
                    required
                    placeholder="10-digit mobile"
                    maxLength={10}
                    value={details.phone}
                    onChange={onDetailsChange}
                  />
                </div>
              </div>
              <div className="auth-form-row" style={{ marginTop: 'var(--space-md)' }}>
                <button 
                  type="button" 
                  className="auth-button auth-button-secondary" 
                  onClick={() => setStep(1)} 
                  disabled={loading}
                >
                  <FiArrowLeft /> Back
                </button>
                <button className="auth-button" disabled={loading} style={{ flexGrow: 1 }}>
                  {loading ? 'Saving...' : 'Finalize Profile'}
                  {!loading && <FiCheckCircle />}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
