import { useState } from 'react'
import { Icon } from '../../../layouts/icons.jsx'

export default function GeneralTab() {
  const [settings, setSettings] = useState({
    businessName: 'Antigravity CRM',
    businessEmail: 'admin@antigravity.io',
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    timezone: '(GMT+05:30) Mumbai, India',
    language: 'English'
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setSettings(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="crm-form-page page-enter">
      <div className="crm-form-card">
        <div className="crm-form-section">
          <div className="section-header-row">
            <div className="section-icon" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
              <Icon name="settings" size={18} />
            </div>
            <h3 className="section-title">Business Information</h3>
          </div>
          
          <div className="auth-form-grid" style={{ marginTop: '20px' }}>
            <div className="auth-group">
              <label className="auth-label text-muted">Business Name</label>
              <input 
                className="crm-input" 
                name="businessName"
                value={settings.businessName}
                onChange={handleChange}
                placeholder="Enter business name"
              />
            </div>
            <div className="auth-group">
              <label className="auth-label text-muted">System Email</label>
              <input 
                className="crm-input" 
                name="businessEmail"
                value={settings.businessEmail}
                onChange={handleChange}
                placeholder="Enter email address"
              />
            </div>
          </div>
        </div>

        <div className="crm-form-section">
          <div className="section-header-row">
            <div className="section-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <Icon name="billing" size={18} />
            </div>
            <h3 className="section-title">Regional & Display</h3>
          </div>

          <div className="auth-form-grid" style={{ marginTop: '20px' }}>
            <div className="auth-group">
              <label className="auth-label text-muted">Currency</label>
              <select className="crm-select" name="currency" value={settings.currency} onChange={handleChange}>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>
            <div className="auth-group">
              <label className="auth-label text-muted">Date Format</label>
              <select className="crm-select" name="dateFormat" value={settings.dateFormat} onChange={handleChange}>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            <div className="auth-group">
              <label className="auth-label text-muted">Timezone</label>
              <select className="crm-select" name="timezone" value={settings.timezone} onChange={handleChange}>
                <option value="(GMT+05:30) Mumbai, India">(GMT+05:30) Mumbai, India</option>
                <option value="(GMT+00:00) London, UK">(GMT+00:00) London, UK</option>
                <option value="(GMT-05:00) New York, USA">(GMT-05:00) New York, USA</option>
              </select>
            </div>
            <div className="auth-group">
              <label className="auth-label text-muted">Language</label>
              <select className="crm-select" name="language" value={settings.language} onChange={handleChange}>
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="Hindi">Hindi</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
          <button className="btn ghost">Reset Changes</button>
          <button className="btn primary action-vibrant">Save Settings</button>
        </div>
      </div>
    </div>
  )
}
