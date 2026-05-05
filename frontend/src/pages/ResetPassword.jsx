import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FiLock, FiCheckCircle, FiArrowLeft, FiShield } from 'react-icons/fi'
import axios from 'axios'

export default function ResetPassword() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      return toast.error('Passwords do not match')
    }
    if (password.length < 6) {
      return toast.error('Password must be at least 6 characters')
    }

    setLoading(true)
    try {
      // Note: We need to implement this endpoint in authController
      await axios.put(`/api/auth/resetpassword/${token}`, { password })
      setSuccess(true)
      toast.success('Password reset successful!')
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired token')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-container premium-gradient">
        <div className="auth-card animate-fade-in text-center" style={{ padding: '40px' }}>
          <div className="success-icon-wrapper" style={{ marginBottom: '24px' }}>
            <FiCheckCircle size={60} color="var(--primary)" />
          </div>
          <h2 className="auth-title">Password Reset!</h2>
          <p className="auth-subtitle">Your password has been updated successfully. Redirecting you to login...</p>
          <Link to="/login" className="crm-btn-premium vibrant full-width" style={{ marginTop: '20px' }}>
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container premium-gradient">
      <div className="auth-card animate-fade-in">
        <div className="auth-header">
          <div className="auth-logo-box">
            <FiShield size={32} />
          </div>
          <h2 className="auth-title">Set New Password</h2>
          <p className="auth-subtitle">Choose a secure password to activate your account</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="sheet-field">
            <label>New Password</label>
            <div className="crm-input-group">
              <div className="input-icon-box"><FiLock /></div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="sheet-field">
            <label>Confirm New Password</label>
            <div className="crm-input-group">
              <div className="input-icon-box"><FiLock /></div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button type="submit" className="crm-btn-premium vibrant full-width" disabled={loading} style={{ marginTop: '10px' }}>
            {loading ? 'Updating...' : 'Reset Password'}
          </button>

          <Link to="/login" className="auth-link" style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <FiArrowLeft size={16} />
            Back to Login
          </Link>
        </form>
      </div>
    </div>
  )
}
