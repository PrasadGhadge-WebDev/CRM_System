import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'react-toastify'
import { leadsApi } from '../services/leads.js'
import { usersApi } from '../services/users.js'
import { Icon } from '../layouts/icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import SearchableSelect from '../modules/crm/components/SearchableSelect.jsx'

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
  const [errorMsg, setErrorMsg] = useState('')
  const [activeTab, setActiveTab] = useState('form') // 'form' or 'history'

  useEffect(() => {
    if (isOpen && lead) {
      setErrorMsg('')
      setActiveTab('form')
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateStr = tomorrow.toISOString().split('T')[0]

      setForm({
        followupDate: dateStr,
        followupTime: '10:00',
        followupType: 'Call',
        note: '',
        assignedTo: lead.assignedTo?.id || lead.assignedTo?._id || user?.id || '',
        statusAfterCall: lead.status || 'Call Later',
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
      setErrorMsg(msg)
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

  const modalContent = (
    <div className="fu-modal-overlay-new" onClick={onClose}>
      <div className="fu-modal-card-new animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="fu-modal-header">
          <div className="fu-header-left">
            <div className="fu-header-icon-main">
              <Icon name="calendar" size={20} />
            </div>
            <div>
              <h2 className="fu-title">Follow-up: <span className="highlight">{lead.name}</span></h2>
              <p className="fu-subtitle">{(lead.email || lead.phone || 'No contact info').toLowerCase()}</p>
            </div>
          </div>
          <button className="fu-close-btn" onClick={onClose}>
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="fu-modal-tabs">
          <button 
            className={`fu-tab ${activeTab === 'form' ? 'active' : ''}`}
            onClick={() => setActiveTab('form')}
          >
            <Icon name="edit" size={14} />
            <span>Schedule Follow-up</span>
          </button>
          <button 
            className={`fu-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <Icon name="activity" size={14} />
            <span>History ({lead.followupHistory?.length || 0})</span>
          </button>
        </div>

        <div className="fu-modal-body custom-scrollbar">
          {activeTab === 'form' ? (
            <form onSubmit={handleSubmit} className="fu-form-grid">
              <div className="fu-section">
                <h3 className="fu-section-title">Schedule Interaction</h3>
                <div className="fu-input-row">
                  <div className="fu-input-group">
                    <label>Date *</label>
                    <input
                      type="date"
                      value={form.followupDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setForm((prev) => ({ ...prev, followupDate: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="fu-input-group">
                    <label>Time *</label>
                    <input
                      type="time"
                      value={form.followupTime}
                      onChange={(e) => setForm((prev) => ({ ...prev, followupTime: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="fu-input-row">
                  <div className="fu-input-group">
                    <label>Type *</label>
                    <SearchableSelect
                      value={form.followupType}
                      onChange={(val) => setForm((prev) => ({ ...prev, followupType: val }))}
                      options={['Call', 'Meeting', 'Email', 'WhatsApp']}
                      icon="activity"
                    />
                  </div>
                  <div className="fu-input-group">
                    <label>Quick Dates</label>
                    <div className="fu-quick-btns">
                      <button type="button" onClick={() => setQuickDate('tomorrow')}>Tomorrow</button>
                      <button type="button" onClick={() => setQuickDate('next-week')}>Next Week</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="fu-section">
                <h3 className="fu-section-title">Assignment & Reminder</h3>
                <div className="fu-input-row">
                  <div className="fu-input-group">
                    <label>Assign To *</label>
                    <SearchableSelect
                      value={form.assignedTo}
                      onChange={(val) => setForm((prev) => ({ ...prev, assignedTo: val }))}
                      options={assignees.map(m => ({ value: m.id || m._id, label: m.name || m.email }))}
                      icon="user"
                    />
                  </div>
                  <div className="fu-input-group">
                    <label>Reminder</label>
                    <div className="fu-reminder-toggle">
                      <input 
                        type="checkbox" 
                        checked={form.sendReminder}
                        onChange={e => setForm(f => ({ ...f, sendReminder: e.target.checked }))}
                      />
                      {form.sendReminder && (
                        <SearchableSelect
                          value={form.reminderOffset}
                          onChange={val => setForm(f => ({ ...f, reminderOffset: val }))}
                          options={[
                            { value: '15m', label: '15m before' },
                            { value: '30m', label: '30m before' },
                            { value: '1h', label: '1h before' }
                          ]}
                          className="fu-mini-select"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="fu-section full-width">
                <h3 className="fu-section-title">Interaction Outcome</h3>
                <div className="fu-outcome-chips">
                  {outcomeOptions.map(opt => (
                    <button 
                      key={opt.value}
                      type="button"
                      className={`fu-chip ${form.statusAfterCall === opt.value ? 'active' : ''}`}
                      onClick={() => setForm(f => ({ ...f, statusAfterCall: opt.value }))}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="fu-section full-width">
                <h3 className="fu-section-title">Activity Notes</h3>
                <textarea 
                  className="fu-textarea"
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Summarize what happened during the contact..."
                />
              </div>

              {errorMsg && <div className="fu-error-msg">{errorMsg}</div>}
            </form>
          ) : (
            <div className="fu-history-list">
              {lead.followupHistory && lead.followupHistory.length > 0 ? (
                lead.followupHistory.slice().reverse().map((h, i) => (
                  <div key={i} className="fu-history-item">
                    <div className="fu-history-dot" />
                    <div className="fu-history-content">
                      <div className="fu-history-header">
                        <span className="fu-h-type">{h.followupType}</span>
                        <span className="fu-h-date">{new Date(h.date).toLocaleString()}</span>
                      </div>
                      <div className="fu-h-outcome">Outcome: <strong>{h.statusAfterCall || 'None'}</strong></div>
                      {h.note && <p className="fu-h-note">"{h.note}"</p>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="fu-empty-history">No follow-up history found.</div>
              )}
            </div>
          )}
        </div>

        <div className="fu-modal-footer">
          <button className="fu-btn-secondary-new" onClick={onClose}>Cancel</button>
          {activeTab === 'form' && (
            <button className="fu-btn-primary-new" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Saving...' : 'Save Follow-up'}
            </button>
          )}
        </div>
      </div>

      <style>{`
        .fu-modal-overlay-new {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .fu-modal-card-new {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 24px;
          width: 100%;
          max-width: 800px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          overflow: hidden;
        }

        .animate-slide-up { animation: fuSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fuSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        .fu-modal-header {
          padding: 24px 32px;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .fu-header-left { display: flex; gap: 16px; align-items: center; }
        .fu-header-icon-main {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: var(--primary-soft);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .fu-title { font-size: 1.25rem; font-weight: 800; color: var(--text); margin: 0; }
        .fu-title .highlight { color: var(--primary); }
        .fu-subtitle { font-size: 0.8rem; color: var(--text-dimmed); margin: 4px 0 0; }

        .fu-close-btn {
          background: transparent;
          border: none;
          color: var(--text-dimmed);
          cursor: pointer;
          transition: 0.2s;
          padding: 8px;
          border-radius: 50%;
        }
        .fu-close-btn:hover { background: var(--bg-surface); color: var(--text); }

        .fu-modal-tabs {
          display: flex;
          padding: 0 32px;
          background: var(--bg-surface);
          border-bottom: 1px solid var(--border);
          gap: 24px;
        }

        .fu-tab {
          padding: 16px 4px;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--text-dimmed);
          font-weight: 700;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: 0.2s;
        }
        .fu-tab:hover { color: var(--text); }
        .fu-tab.active { border-color: var(--primary); color: var(--primary); }

        .fu-modal-body {
          padding: 32px;
          overflow-y: auto;
          flex: 1;
        }

        .fu-form-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
        }

        .fu-section { display: flex; flex-direction: column; gap: 16px; }
        .fu-section.full-width { grid-column: 1 / -1; }
        .fu-section-title { font-size: 0.75rem; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.1em; margin: 0; }

        .fu-input-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .fu-input-group { display: flex; flex-direction: column; gap: 8px; }
        .fu-input-group label { font-size: 0.8rem; font-weight: 700; color: var(--text); }

        .fu-input-group input, .fu-textarea {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 10px 16px;
          color: var(--text);
          font-size: 0.9rem;
          outline: none;
          transition: 0.2s;
        }
        .fu-input-group input:focus, .fu-textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-soft); }

        .fu-quick-btns { display: flex; gap: 8px; }
        .fu-quick-btns button {
          flex: 1;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text);
          cursor: pointer;
          transition: 0.2s;
        }
        .fu-quick-btns button:hover { border-color: var(--primary); color: var(--primary); }

        .fu-reminder-toggle { display: flex; align-items: center; gap: 12px; height: 42px; }
        .fu-mini-select { flex: 1; min-width: 0; }

        .fu-outcome-chips { display: flex; flex-wrap: wrap; gap: 10px; }
        .fu-chip {
          padding: 8px 16px;
          border-radius: 20px;
          border: 1px solid var(--border);
          background: var(--bg-surface);
          color: var(--text-dimmed);
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
        }
        .fu-chip:hover { border-color: var(--text-dimmed); color: var(--text); }
        .fu-chip.active { background: var(--primary); border-color: var(--primary); color: white; }

        .fu-textarea { min-height: 100px; resize: none; width: 100%; }

        .fu-history-list { display: flex; flex-direction: column; gap: 24px; position: relative; padding-left: 20px; }
        .fu-history-list::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px; background: var(--border); }
        .fu-history-item { position: relative; }
        .fu-history-dot { position: absolute; left: -24px; top: 8px; width: 10px; height: 10px; border-radius: 50%; background: var(--primary); border: 2px solid var(--bg-card); }
        .fu-history-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .fu-h-type { font-weight: 800; font-size: 0.85rem; color: var(--text); text-transform: uppercase; }
        .fu-h-date { font-size: 0.75rem; color: var(--text-dimmed); }
        .fu-h-outcome { font-size: 0.8rem; color: var(--text); margin-bottom: 4px; }
        .fu-h-note { font-size: 0.85rem; color: var(--text-dimmed); font-style: italic; margin: 0; line-height: 1.5; }

        .fu-modal-footer {
          padding: 24px 32px;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          background: var(--bg-surface);
        }

        .fu-btn-secondary-new {
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 10px 24px;
          color: var(--text);
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: 0.2s;
        }
        .fu-btn-secondary-new:hover { background: var(--bg-card); border-color: var(--text-dimmed); }

        .fu-btn-primary-new {
          background: var(--primary);
          border: none;
          border-radius: 12px;
          padding: 10px 32px;
          color: white;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: 0.3s;
          box-shadow: 0 4px 12px var(--primary-soft);
        }
        .fu-btn-primary-new:hover { transform: translateY(-2px); box-shadow: 0 8px 20px var(--primary-soft); opacity: 0.9; }
        .fu-btn-primary-new:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .fu-error-msg { color: #ef4444; font-size: 0.8rem; font-weight: 600; text-align: center; }

        @media (max-width: 600px) {
          .fu-input-row { grid-template-columns: 1fr; }
          .fu-modal-card-new { border-radius: 0; max-height: 100vh; }
        }
      `}</style>
    </div>
  )

  return createPortal(modalContent, document.body)
}
