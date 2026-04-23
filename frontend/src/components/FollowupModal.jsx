import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { leadsApi } from '../services/leads.js'
import { usersApi } from '../services/users.js'
import { Icon } from '../layouts/icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function FollowupModal({ isOpen, onClose, lead, onSave }) {
  const { user } = useAuth()
  const [assignees, setAssignees] = useState([])
  const [form, setForm] = useState({
    followupDate: '',
    followupTime: '10:00',
    followupType: 'Call',
    note: '',
    assignedTo: '',
    statusAfterCall: 'Call Later',
    followUpStatus: 'planned',
    sendReminder: false,
    reminderOffset: '15m',
    requestId: '',
    expectedClosingDate: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && lead) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateStr = tomorrow.toISOString().split('T')[0]

      setForm({
        followupDate: dateStr,
        followupTime: '10:00',
        followupType: 'Call',
        note: '',
        assignedTo: lead.assignedTo?.id || lead.assignedTo?._id || user?.id || '',
        statusAfterCall: 'Call Later',
        followUpStatus: 'planned',
        sendReminder: false,
        reminderOffset: '15m',
        requestId: crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15),
        expectedClosingDate: lead.expectedClosingDate ? new Date(lead.expectedClosingDate).toISOString().split('T')[0] : '',
      })
    }
  }, [isOpen, lead, user?.id])

  useEffect(() => {
    if (!isOpen || !user?.id) return

    const loadAssignees = async () => {
      try {
        const filter = user.role === 'Admin' ? { limit: 100 } : { manager_id: user.id, limit: 100 }
        const res = await usersApi.list(filter)
        const team = (res.items || []).filter((u) => u.status === 'active')
        if (!team.some((u) => String(u.id || u._id) === String(user.id || user._id))) {
          team.push(user)
        }
        setAssignees(team)
      } catch {
        setAssignees([user])
      }
    }

    loadAssignees()
  }, [isOpen, user])

  const setQuickDate = (type) => {
    const now = new Date()
    const target = new Date()

    if (type === 'tomorrow') {
      target.setDate(now.getDate() + 1)
      target.setHours(10, 0, 0, 0)
    } else if (type === 'next-week') {
      target.setDate(now.getDate() + 7)
      target.setHours(10, 0, 0, 0)
    }

    setForm((prev) => ({
      ...prev,
      followupDate: target.toISOString().split('T')[0],
      followupTime: target.toTimeString().substring(0, 5),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.followupDate) {
      toast.error('Follow-up date is required')
      return
    }
    if (!form.followupTime) {
      toast.error('Follow-up time is required')
      return
    }
    if (!form.followupType) {
      toast.error('Follow-up type is required')
      return
    }
    if (!form.assignedTo) {
      toast.error('Assigned To is required')
      return
    }
    if (!form.statusAfterCall) {
      toast.error('Status After Call is required')
      return
    }

    setLoading(true)
    try {
      const scheduledAt = new Date(`${form.followupDate}T${form.followupTime}`).toISOString()
      const leadId = lead.id || lead._id
      const reminderEnabled = Boolean(form.sendReminder)

      const updatedLead = await leadsApi.updateFollowup(leadId, {
        mode: form.followupType,
        status: form.followUpStatus,
        nextFollowupDate: scheduledAt,
        followupDate: form.followupDate,
        followupTime: form.followupTime,
        followupType: form.followupType,
        note: form.note,
        assignedTo: form.assignedTo,
        statusAfterCall: form.statusAfterCall,
        reminder: reminderEnabled,
        reminderTime: reminderEnabled ? form.followupTime : '',
        reminderOffsets: reminderEnabled ? [form.reminderOffset] : [],
        requestId: form.requestId,
        expectedClosingDate: form.expectedClosingDate || undefined,
      })

      toast.success('Follow-up updated successfully')
      onSave?.(updatedLead)
      onClose()
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to save follow-up'
      toast.error(msg)
      if (error.response?.status === 409) {
        setForm((prev) => ({
          ...prev,
          requestId: crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15),
        }))
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !lead) return null

  const phone = String(lead.phone || '').trim() || 'N/A'
  const email = String(lead.email || '').trim() || 'N/A'

  const outcomeOptions = [
    { value: 'Converted', label: 'Converted' },
    { value: 'Interested', label: 'Interested' },
    { value: 'Not Interested', label: 'Not Interested' },
    { value: 'Call Later', label: 'Call Later' },
    { value: 'Wrong Number', label: 'Wrong No.' },
    { value: 'No Response', label: 'No Response' },
    { value: 'Demo Scheduled', label: 'Demo Scheduled' },
    { value: 'Negotiation', label: 'Negotiation' },
  ]

  return (
    <div className="fu-modal-overlay" onClick={onClose}>
      <div className="fu-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="fu-topbar">
          <button type="button" className="fu-back-btn" onClick={onClose}>
            <Icon name="arrowLeft" />
            <span>BACK</span>
          </button>
          <div className="fu-user-meta">
            <span>{user?.name || 'User'}</span>
            <span>{user?.role || 'Admin'}</span>
          </div>
        </div>

        <div className="fu-form-wrap">
          <div className="fu-main-header">
            <h2 className="fu-main-title">
              Follow-up Form: <span className="fu-lead-name">{lead.name || 'Lead'}</span>
            </h2>
            {/* <p className="fu-main-subtitle">Manage follow-up details, schedule next steps, and log outcomes.</p> */}
          </div>

          <form onSubmit={handleSubmit} className="fu-form">
            <section className="fu-panel fu-info-panel">
              <div className="fu-panel-header">
                <div className="fu-header-icon">👤</div>
                <div>
                  <div className="fu-panel-title">LEAD INFORMATION</div>
                  <div className="fu-panel-sub">Current contact details and activity history</div>
                </div>
              </div>
              <div className="fu-lead-grid">
                <div className="fu-lead-card">
                  <div className="fu-lead-label">NAME</div>
                  <div className="fu-lead-value">{lead.name || 'N/A'}</div>
                </div>
                <div className="fu-lead-card">
                  <div className="fu-lead-label">PHONE</div>
                  <div className="fu-lead-value">{phone}</div>
                </div>
                <div className="fu-lead-card">
                  <div className="fu-lead-label">EMAIL</div>
                  <div className="fu-lead-value fu-ellipsis">{email}</div>
                </div>
                <div className="fu-lead-card">
                  <div className="fu-lead-label">LAST CONTACT</div>
                  <div className="fu-lead-value">{lead.lastContactDate ? new Date(lead.lastContactDate).toLocaleDateString() : 'N/A'}</div>
                </div>
                <div className="fu-lead-card">
                  <div className="fu-lead-label">CREATED AT</div>
                  <div className="fu-lead-value">{lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'N/A'}</div>
                </div>
                <div className="fu-lead-card">
                  <div className="fu-lead-label">UPDATED AT</div>
                  <div className="fu-lead-value">{lead.updated_at ? new Date(lead.updated_at).toLocaleDateString() : 'N/A'}</div>
                </div>
              </div>
              <div className="fu-status-strip">STATUS: {(lead.status || 'NEW').toUpperCase()}</div>
            </section>

            <div className="fu-split-grid">
              <section className="fu-panel">
                <div className="fu-panel-header">
                  <div className="fu-header-icon">📅</div>
                  <div>
                    <div className="fu-panel-title">FOLLOW-UP INFO</div>
                    <div className="fu-panel-sub">Schedule the next engagement</div>
                  </div>
                </div>
                <div className="fu-fields-stack">
                  <label className="fu-field-row">
                    <span>DATE *</span>
                    <input
                      type="date"
                      value={form.followupDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setForm((prev) => ({ ...prev, followupDate: e.target.value }))}
                      required
                    />
                  </label>
                  <label className="fu-field-row">
                    <span>TIME *</span>
                    <input
                      type="time"
                      value={form.followupTime}
                      onChange={(e) => setForm((prev) => ({ ...prev, followupTime: e.target.value }))}
                      required
                    />
                  </label>
                  <label className="fu-field-row">
                    <span>TYPE *</span>
                    <select
                      value={form.followupType}
                      onChange={(e) => setForm((prev) => ({ ...prev, followupType: e.target.value }))}
                      required
                    >
                      <option value="Call">Call</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Email">Email</option>
                      <option value="Meeting">Meeting</option>
                      <option value="Demo">Demo</option>
                    </select>
                  </label>
                  <label className="fu-field-row">
                    <span>STATUS</span>
                    <select
                      value={form.followUpStatus}
                      onChange={(e) => setForm((prev) => ({ ...prev, followUpStatus: e.target.value }))}
                      required
                    >
                      <option value="planned">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="missed">Missed</option>
                    </select>
                  </label>
                  <label className="fu-field-row">
                    <span>EXPECTED CLOSING</span>
                    <input
                      type="date"
                      value={form.expectedClosingDate}
                      onChange={(e) => setForm((prev) => ({ ...prev, expectedClosingDate: e.target.value }))}
                    />
                  </label>
                </div>
              </section>

              <div className="fu-column-stack">
                <section className="fu-panel fu-quick-panel">
                  <div className="fu-panel-header">
                    <div className="fu-header-icon">⚡</div>
                    <div>
                      <div className="fu-panel-title">QUICK ACTIONS</div>
                    </div>
                  </div>
                  <div className="fu-quick-actions">
                    <button type="button" onClick={() => setQuickDate('tomorrow')}>Tomorrow 10AM</button>
                    <button type="button" onClick={() => setQuickDate('next-week')}>Next Week</button>
                  </div>
                </section>

                <section className="fu-panel">
                  <div className="fu-panel-header">
                    <div className="fu-header-icon">🔔</div>
                    <div>
                      <div className="fu-panel-title">ASSIGN & REMINDER</div>
                    </div>
                  </div>
                  <div className="fu-assign-row">
                    <label className="fu-assign-control">
                      <span>ASSIGN:</span>
                      <select
                        value={form.assignedTo}
                        onChange={(e) => setForm((prev) => ({ ...prev, assignedTo: e.target.value }))}
                        required
                      >
                        <option value="">Select</option>
                        {assignees.map((member) => {
                          const memberId = member.id || member._id
                          return (
                            <option key={memberId} value={memberId}>
                              {member.name || member.email || 'User'}
                            </option>
                          )
                        })}
                      </select>
                    </label>

                    <div className="fu-reminder-group">
                      <label className="fu-reminder-toggle">
                        <input
                          type="checkbox"
                          checked={form.sendReminder}
                          onChange={(e) => setForm((prev) => ({ ...prev, sendReminder: e.target.checked }))}
                        />
                        <span>🔔 Reminder: Send reminder</span>
                      </label>

                      {form.sendReminder && (
                        <label className="fu-reminder-offset">
                          <span>Before:</span>
                          <select
                            value={form.reminderOffset}
                            onChange={(e) => setForm((prev) => ({ ...prev, reminderOffset: e.target.value }))}
                          >
                            <option value="15m">15 min</option>
                            <option value="30m">30 min</option>
                            <option value="1h">1 hour</option>
                            <option value="1d">1 day</option>
                          </select>
                        </label>
                      )}
                    </div>
                  </div>
                </section>
              </div>

              <section className="fu-panel fu-notes-panel">
                <div className="fu-panel-header">
                  <div className="fu-header-icon">📝</div>
                  <div>
                    <div className="fu-panel-title">NOTES</div>
                  </div>
                </div>
                <div className="fu-notes-box">
                  <textarea
                    value={form.note}
                    onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                    placeholder="Add detailed notes here..."
                    rows={8}
                  />
                </div>
              </section>
            </div>

            <section className="fu-panel">
              <div className="fu-panel-header">
                <div className="fu-header-icon">🎯</div>
                <div>
                  <div className="fu-panel-title">OUTCOME *</div>
                  <div className="fu-panel-sub">What was the result of the last contact?</div>
                </div>
              </div>
              <div className="fu-outcome-grid">
                {outcomeOptions.map((option) => (
                  <label className="fu-outcome-option" key={option.value}>
                    <input
                      type="radio"
                      name="statusAfterCall"
                      value={option.value}
                      checked={form.statusAfterCall === option.value}
                      onChange={(e) => setForm((prev) => ({ ...prev, statusAfterCall: e.target.value }))}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="fu-panel fu-footer-panel">
              <button type="button" className="fu-btn secondary" onClick={onClose}>CANCEL</button>
              <button type="submit" className="fu-btn primary" disabled={loading}>
                {loading ? 'SAVING...' : 'SAVE FOLLOW-UP'}
              </button>
            </section>
          </form>
        </div>

        <style>{`
          .fu-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(2, 6, 23, 0.9);
            z-index: 9999;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            overflow-y: auto;
          }

          .fu-modal-card {
            width: 100%;
            min-height: 100vh;
            border-radius: 0;
            overflow: hidden;
            border: 0;
            background: var(--bg-elevated, #0f172a);
            color: var(--text);
            box-shadow: none;
            display: flex;
            flex-direction: column;
          }

          .fu-topbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px 48px;
            border-bottom: 1px solid var(--border, rgba(255,255,255,0.06));
            background: rgba(59,130,246,0.04);
            backdrop-filter: blur(20px);
            position: sticky;
            top: 0;
            z-index: 10;
          }

          .fu-back-btn {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            border: 1px solid var(--border, rgba(255,255,255,0.1));
            background: rgba(255,255,255,0.04);
            color: var(--text-muted);
            border-radius: 12px;
            padding: 10px 22px;
            font-weight: 700;
            font-size: 0.85rem;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .fu-back-btn:hover {
            border-color: var(--primary, #3b82f6);
            background: rgba(59,130,246,0.12);
            color: var(--primary, #3b82f6);
            transform: translateX(-4px);
          }

          .fu-user-meta {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 2px;
          }
          .fu-user-meta span:first-child { font-weight: 800; font-size: 0.95rem; }
          .fu-user-meta span:last-child { font-size: 0.75rem; color: var(--primary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }

          .fu-form-wrap {
            padding: 50px 48px;
            max-width: 1400px;
            margin: 0 auto;
            width: 100%;
            flex: 1;
          }

          .fu-main-header {
            margin-bottom: 40px;
          }

          .fu-main-title {
            margin: 0 0 8px;
            font-size: 2.2rem;
            font-weight: 900;
            color: var(--text);
            letter-spacing: -0.03em;
            line-height: 1.1;
          }

          .fu-lead-name {
            background: linear-gradient(135deg, #60a5fa, #a78bfa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .fu-main-subtitle {
            font-size: 1rem;
            color: var(--text-dimmed);
            margin: 0;
          }

          .fu-form {
            display: flex;
            flex-direction: column;
            gap: 24px;
          }

          .fu-panel {
            background: var(--panel-bg, rgba(30, 41, 59, 0.5));
            backdrop-filter: blur(10px);
            border: 1px solid var(--border, rgba(255,255,255,0.06));
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
          }
          .fu-panel:hover {
            border-color: rgba(59,130,246,0.2);
            box-shadow: 0 15px 40px rgba(0,0,0,0.15);
          }

          .fu-panel-header {
            padding: 20px 24px;
            display: flex;
            align-items: center;
            gap: 16px;
            border-bottom: 1px solid rgba(255,255,255,0.04);
            background: rgba(255,255,255,0.02);
          }

          .fu-header-icon {
            width: 42px;
            height: 42px;
            border-radius: 12px;
            background: linear-gradient(135deg, rgba(59,130,246,0.15), rgba(167,139,250,0.15));
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
            border: 1px solid rgba(59,130,246,0.1);
          }

          .fu-panel-title {
            font-size: 0.85rem;
            font-weight: 800;
            color: var(--text);
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }

          .fu-panel-sub {
            font-size: 0.75rem;
            color: var(--text-dimmed);
            margin-top: 2px;
          }

          .fu-lead-grid {
            padding: 24px;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
          }

          .fu-lead-card {
            border: 1px solid rgba(255,255,255,0.05);
            border-radius: 14px;
            background: rgba(255,255,255,0.03);
            padding: 16px;
          }

          .fu-lead-label {
            font-size: 0.65rem;
            color: var(--text-dimmed);
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            margin-bottom: 8px;
          }

          .fu-lead-value {
            font-size: 1rem;
            color: var(--text);
            font-weight: 700;
          }

          .fu-status-strip {
            margin: 0 24px 24px;
            border-radius: 12px;
            padding: 14px 20px;
            font-weight: 800;
            font-size: 0.9rem;
            text-align: center;
            background: rgba(59,130,246,0.1);
            color: var(--primary, #3b82f6);
            border: 1px solid rgba(59,130,246,0.2);
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }

          .fu-split-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
          }

          .fu-fields-stack {
            padding: 24px;
            display: grid;
            gap: 20px;
          }

          .fu-field-row {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .fu-field-row span { font-size: 0.75rem; font-weight: 800; color: var(--text-dimmed); letter-spacing: 0.04em; }

          .fu-field-row input,
          .fu-field-row select,
          .fu-assign-control select {
            height: 48px;
            border: 1px solid var(--border, rgba(255,255,255,0.1));
            border-radius: 12px;
            background: rgba(0,0,0,0.2);
            color: var(--text);
            padding: 0 16px;
            outline: none;
            font-size: 0.95rem;
            transition: all 0.2s;
          }
          .fu-field-row input:focus,
          .fu-field-row select:focus {
            border-color: var(--primary, #3b82f6);
            background: rgba(0,0,0,0.3);
            box-shadow: 0 0 0 4px rgba(59,130,246,0.1);
          }

          .fu-column-stack {
            display: grid;
            gap: 24px;
            align-content: start;
          }

          .fu-quick-panel {
            min-height: auto;
          }

          .fu-quick-actions {
            padding: 24px;
            display: flex;
            gap: 12px;
          }

          .fu-quick-actions button {
            flex: 1;
            border: 1px solid rgba(59,130,246,0.2);
            border-radius: 12px;
            height: 44px;
            background: rgba(59,130,246,0.06);
            color: var(--text);
            font-weight: 700;
            font-size: 0.85rem;
            cursor: pointer;
            transition: all 0.2s;
          }
          .fu-quick-actions button:hover {
            background: rgba(59,130,246,0.15);
            border-color: var(--primary);
            transform: translateY(-2px);
          }

          .fu-notes-box {
            padding: 24px;
          }

          .fu-notes-box textarea {
            width: 100%;
            min-height: 140px;
            border: 1px solid var(--border, rgba(255,255,255,0.1));
            border-radius: 16px;
            background: rgba(0,0,0,0.2);
            color: var(--text);
            padding: 16px;
            resize: vertical;
            outline: none;
            font-size: 0.95rem;
            line-height: 1.6;
          }

          .fu-outcome-grid {
            padding: 28px;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 14px;
          }

          .fu-outcome-option {
            display: flex;
            align-items: center;
            gap: 12px;
            color: var(--text);
            font-size: 0.95rem;
            padding: 12px 16px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.05);
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
          }
          .fu-outcome-option:hover { background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.3); }
          .fu-outcome-option:has(input:checked) {
            background: rgba(59,130,246,0.15);
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
          }

          .fu-outcome-option input {
            width: 18px;
            height: 18px;
            accent-color: var(--primary);
          }

          .fu-assign-row {
            padding: 24px;
            display: flex;
            align-items: center;
            gap: 24px;
          }

          .fu-assign-control {
            display: flex;
            flex-direction: column;
            gap: 8px;
            flex: 1;
          }
          .fu-assign-control span { font-size: 0.75rem; font-weight: 800; color: var(--text-dimmed); letter-spacing: 0.04em; }

          .fu-reminder-group {
            display: flex;
            align-items: center;
            gap: 16px;
            background: rgba(59,130,246,0.08);
            padding: 12px 20px;
            border-radius: 14px;
            border: 1px solid rgba(59,130,246,0.2);
            margin-top: 24px;
          }

          .fu-reminder-toggle {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            color: var(--text);
            font-weight: 800;
            cursor: pointer;
            white-space: nowrap;
          }
          .fu-reminder-toggle input { width: 18px; height: 18px; accent-color: var(--primary); }

          .fu-reminder-offset {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 0.9rem;
            color: var(--text);
            font-weight: 700;
          }
          .fu-reminder-offset select {
            height: 36px;
            padding: 0 12px;
            border-radius: 8px;
            background: rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.1);
            color: var(--text);
            font-size: 0.85rem;
            cursor: pointer;
          }

          .fu-footer-panel {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            padding: 32px 48px;
            gap: 20px;
            background: none;
            border: none;
          }

          .fu-btn {
            height: 52px;
            border-radius: 14px;
            font-weight: 800;
            letter-spacing: 0.05em;
            padding: 0 32px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-size: 0.95rem;
          }

          .fu-btn.secondary {
            border: 1px solid var(--border, rgba(255,255,255,0.1));
            background: rgba(255,255,255,0.03);
            color: var(--text-muted);
          }
          .fu-btn.secondary:hover { background: rgba(255,255,255,0.08); border-color: var(--text-muted); }

          .fu-btn.primary {
            border: 0;
            background: linear-gradient(135deg, #1d4ed8, #7c3aed);
            color: #fff;
            box-shadow: 0 10px 25px rgba(29, 78, 216, 0.3);
          }
          .fu-btn.primary:hover:not(:disabled) {
            transform: translateY(-3px);
            box-shadow: 0 15px 35px rgba(29, 78, 216, 0.4);
            filter: brightness(1.1);
          }
          .fu-btn.primary:disabled { opacity: 0.5; cursor: not-allowed; }

          @media (max-width: 1200px) {
            .fu-split-grid { grid-template-columns: 1fr; }
            .fu-lead-grid { grid-template-columns: repeat(2, 1fr); }
            .fu-form-wrap { padding: 40px 24px; }
            .fu-topbar { padding: 20px 24px; }
          }
          @media (max-width: 900px) {
            .fu-outcome-grid { grid-template-columns: repeat(2, 1fr); }
            .fu-main-title { font-size: 1.8rem; }
          }
          @media (max-width: 560px) {
            .fu-outcome-grid { grid-template-columns: 1fr; }
            .fu-footer-panel { flex-direction: column-reverse; align-items: stretch; }
            .fu-lead-grid { grid-template-columns: 1fr; }
          }
        `}</style>
      </div>
    </div>
  )
}
