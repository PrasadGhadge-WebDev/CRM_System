import { useState } from 'react'
import { Icon } from '../../../layouts/icons.jsx'

export default function SecurityTab() {
  const [policies, setPolicies] = useState({
    minPasswordLength: 8,
    requireSpecialChar: true,
    twoFactorAuth: false,
    sessionTimeout: 60,
    maxLoginAttempts: 5
  })

  const handleToggle = (key) => {
    setPolicies(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="crm-form-page page-enter">
      <div className="crm-form-card">
        <div className="crm-form-section">
          <div className="section-header-row">
            <div className="section-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <Icon name="lock" size={18} />
            </div>
            <h3 className="section-title">Password & Access Policies</h3>
          </div>

          <div className="stack" style={{ marginTop: '20px', gap: '16px' }}>
            <div className="settingRow" style={{ padding: '16px', background: 'var(--surface-overlay)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div className="settingMeta">
                <div className="settingTitle">Password Complexity</div>
                <div className="settingDescription">Require at least one special character and number</div>
              </div>
              <input 
                type="checkbox" 
                className="settingCheckbox" 
                checked={policies.requireSpecialChar}
                onChange={() => handleToggle('requireSpecialChar')}
              />
            </div>

            <div className="settingRow" style={{ padding: '16px', background: 'var(--surface-overlay)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div className="settingMeta">
                <div className="settingTitle">Two-Factor Authentication</div>
                <div className="settingDescription">Add an extra layer of security to all Admin accounts</div>
              </div>
              <input 
                type="checkbox" 
                className="settingCheckbox" 
                checked={policies.twoFactorAuth}
                onChange={() => handleToggle('twoFactorAuth')}
              />
            </div>
          </div>

          <div className="auth-form-grid" style={{ marginTop: '24px' }}>
            <div className="auth-group">
              <label className="auth-label text-muted">Minimum Password Length</label>
              <input 
                type="number" 
                className="crm-input" 
                value={policies.minPasswordLength}
                onChange={(e) => setPolicies({...policies, minPasswordLength: e.target.value})}
              />
            </div>
            <div className="auth-group">
              <label className="auth-label text-muted">Session Timeout (minutes)</label>
              <input 
                type="number" 
                className="crm-input" 
                value={policies.sessionTimeout}
                onChange={(e) => setPolicies({...policies, sessionTimeout: e.target.value})}
              />
            </div>
          </div>
        </div>

        <div className="crm-form-section">
          <div className="section-header-row">
            <div className="section-icon" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
              <Icon name="info" size={18} />
            </div>
            <h3 className="section-title">System Audit Log</h3>
          </div>
          <div className="muted" style={{ padding: '20px 0', fontSize: '13px' }}>
            System logs are currently being recorded. You can view them in the Reports module.
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
          <button className="btn primary action-vibrant">Update Security Policy</button>
        </div>
      </div>
    </div>
  )
}
