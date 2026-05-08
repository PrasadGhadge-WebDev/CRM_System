import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'react-toastify'
import { leadsApi } from '../services/leads.js'
import { usersApi } from '../services/users.js'
import { Icon } from '../layouts/icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import SearchableSelect from '../modules/crm/components/SearchableSelect.jsx'

export default function FollowupModal({ isOpen, onClose, lead, onSave, initialTab = 'form' }) {
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
  const [hPage, setHPage] = useState(1)
  const hLimit = 5

  useEffect(() => {
    if (isOpen && lead) {
      setErrorMsg('')
      setActiveTab(initialTab)
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
    <div className="crm-modal-portal-overlay" onClick={onClose}>
      <div className="crm-modal-sheet animate-sheet-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px' }}>
        <div className="crm-modal-sheet-header">
          <div className="sheet-title-area">
            <h2 className="sheet-title">Follow-up: <span style={{ color: 'var(--primary)' }}>{lead.name}</span></h2>
            <p className="sheet-subtitle">{(lead.email || lead.phone || 'No contact info').toLowerCase()}</p>
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

        <div className="crm-modal-sheet-body custom-scrollbar">
          <div className="sheet-content-container">
            {activeTab === 'form' ? (
              <form onSubmit={handleSubmit} className="fu-form-grid">
                <section className="form-sheet-section">
                  <div className="form-sheet-section-header">
                    <Icon name="calendar" />
                    <span>Schedule Interaction</span>
                  </div>
                  <div className="form-sheet-grid">
                    <div className="sheet-field">
                      <label>Date *</label>
                      <div className="crm-input-group">
                        <div className="input-icon-box"><Icon name="calendar" size={14} /></div>
                        <input
                          type="date"
                          value={form.followupDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setForm((prev) => ({ ...prev, followupDate: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    <div className="sheet-field">
                      <label>Time *</label>
                      <div className="crm-input-group">
                        <div className="input-icon-box"><Icon name="clock" size={14} /></div>
                        <input
                          type="time"
                          value={form.followupTime}
                          onChange={(e) => setForm((prev) => ({ ...prev, followupTime: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    <div className="sheet-field">
                      <label>Type *</label>
                      <SearchableSelect
                        value={form.followupType}
                        onChange={(val) => setForm((prev) => ({ ...prev, followupType: val }))}
                        options={['Call', 'Meeting', 'Email', 'WhatsApp']}
                        icon="activity"
                      />
                    </div>
                    <div className="sheet-field">
                      <label>Quick Selection</label>
                      <div className="fu-quick-btns">
                        <button type="button" className="fu-quick-chip" onClick={() => setQuickDate('tomorrow')}>
                          <Icon name="calendar" size={12} />
                          <span>Tomorrow</span>
                        </button>
                        <button type="button" className="fu-quick-chip" onClick={() => setQuickDate('next-week')}>
                          <Icon name="calendar" size={12} />
                          <span>Next Week</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="form-sheet-section">
                  <div className="form-sheet-section-header">
                    <Icon name="user" />
                    <span>Assignment & Reminder</span>
                  </div>
                  <div className="form-sheet-grid">
                    <div className="sheet-field">
                      <label>Assign To *</label>
                      <SearchableSelect
                        value={form.assignedTo}
                        onChange={(val) => setForm((prev) => ({ ...prev, assignedTo: val }))}
                        options={assignees.map(m => ({ value: m.id || m._id, label: m.name || m.email }))}
                        icon="user"
                      />
                    </div>
                    <div className="sheet-field">
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
                </section>

                <section className="form-sheet-section">
                  <div className="form-sheet-section-header">
                    <Icon name="activity" />
                    <span>Interaction Outcome *</span>
                  </div>
                  <div className="form-sheet-grid">
                    <div className="sheet-field full-width">
                      <div className="crm-input-group">
                        <div className="input-icon-box"><Icon name="check" size={14} /></div>
                        <input
                          type="text"
                          list="outcome-list"
                          className="fu-outcome-hybrid-input"
                          value={form.statusAfterCall}
                          onChange={(e) => setForm(f => ({ ...f, statusAfterCall: e.target.value }))}
                          placeholder="Type custom outcome or select from list..."
                          required
                        />
                        <datalist id="outcome-list">
                          {outcomeOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </datalist>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="form-sheet-section no-border">
                  <div className="form-sheet-section-header">
                    <Icon name="info" />
                    <span>Activity Notes</span>
                  </div>
                  <div className="form-sheet-grid">
                    <div className="sheet-field full-width">
                      <div className="crm-input-group">
                        <div className="input-icon-box" style={{ alignItems: 'flex-start', paddingTop: '12px' }}>
                          <Icon name="edit" size={14} />
                        </div>
                        <textarea 
                          style={{ minHeight: '120px' }}
                          value={form.note}
                          onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                          placeholder="Summarize what happened during the contact..."
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {errorMsg && <div className="fu-error-msg" style={{ margin: '0 0 20px' }}>{errorMsg}</div>}
              </form>
            ) : (
              <div className="fu-history-container">
                <div className="fu-history-list">
                  {lead.followupHistory && lead.followupHistory.length > 0 ? (
                    (() => {
                      const reversed = [...lead.followupHistory].reverse()
                      const displayH = reversed.slice((hPage - 1) * hLimit, hPage * hLimit)
                      const totalHPages = Math.ceil(reversed.length / hLimit)

                      return (
                        <>
                          {displayH.map((h, i) => (
                            <div key={i} className="fu-history-item">
                              <div className="fu-history-icon-wrapper">
                                <Icon name={h.followupType === 'Call' ? 'phone' : h.followupType === 'Meeting' ? 'user' : h.followupType === 'Email' ? 'mail' : 'message-square'} size={18} />
                              </div>
                              <div className="fu-history-content-card">
                                <div className="fu-history-header">
                                  <div className="fu-h-info">
                                    <span className="fu-h-type">{h.followupType}</span>
                                    <span className="fu-h-date">{new Date(h.date).toLocaleString()}</span>
                                  </div>
                                  <div className="fu-h-status-badge">{h.statusAfterCall || 'None'}</div>
                                </div>
                                <div className="fu-h-outcome">
                                  <Icon name="check-circle" size={14} style={{ color: 'var(--success)' }} />
                                  <span>Outcome: {h.statusAfterCall || 'None'}</span>
                                </div>
                                {h.note && (
                                  <div className="fu-h-note-box">
                                    <p className="fu-h-note">"{h.note}"</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}

                          {totalHPages > 1 && (
                            <div className="fu-h-pagination">
                              <button 
                                className="fu-h-pag-btn" 
                                disabled={hPage === 1}
                                onClick={() => setHPage(p => p - 1)}
                              >
                                <Icon name="chevron-left" size={14} />
                              </button>
                              <span className="fu-h-pag-info">Page {hPage} of {totalHPages}</span>
                              <button 
                                className="fu-h-pag-btn" 
                                disabled={hPage === totalHPages}
                                onClick={() => setHPage(p => p + 1)}
                              >
                                <Icon name="chevron-right" size={14} />
                              </button>
                            </div>
                          )}
                        </>
                      )
                    })()
                  ) : (
                    <div className="fu-empty-history">No follow-up history found.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="crm-modal-sheet-footer">
          <p className="footer-hint">Next interaction is automatically synced to calendar.</p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="crm-btn-premium glass" onClick={onClose}>Cancel</button>
            {activeTab === 'form' && (
              <button className="crm-btn-premium vibrant" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Saving...' : 'Save Follow-up'}
              </button>
            )}
          </div>
        </div>
      </div>


      <style>{`
        .fu-modal-tabs {
          display: flex;
          padding: 0 40px;
          background: var(--bg-card);
          border-bottom: 1px solid var(--border);
          gap: 24px;
        }

        .fu-tab {
          padding: 16px 4px;
          background: transparent;
          border: none;
          border-bottom: 3px solid transparent;
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

        .fu-quick-btns { display: flex; gap: 10px; padding-top: 4px; }
        .fu-quick-chip {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: var(--bg-surface);
          border: 1.5px solid var(--border);
          border-radius: 10px;
          padding: 10px;
          font-size: 0.75rem;
          font-weight: 800;
          color: var(--text-dimmed);
          cursor: pointer;
          transition: all 0.2s ease;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .fu-quick-chip:hover { 
          border-color: var(--primary); 
          color: var(--primary); 
          background: var(--primary-soft);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.1);
        }
        .fu-quick-chip:active { transform: translateY(0); }

        .fu-reminder-toggle { display: flex; align-items: center; gap: 12px; height: 42px; }
        .fu-mini-select { flex: 1; min-width: 0; }

        .fu-history-list {
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding: 24px 8px;
          position: relative;
        }

        .fu-history-list::before {
          content: '';
          position: absolute;
          left: 27px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: linear-gradient(to bottom, var(--primary-soft), var(--border), transparent);
          opacity: 0.5;
        }

        .fu-history-item {
          display: flex;
          gap: 20px;
          position: relative;
          z-index: 1;
        }

        .fu-history-icon-wrapper {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: var(--bg-card);
          border: 1px solid var(--border-strong);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: var(--shadow-sm);
          color: var(--primary);
          transition: all 0.3s;
        }

        .fu-history-item:hover .fu-history-icon-wrapper {
          transform: scale(1.1);
          border-color: var(--primary);
          background: var(--primary-soft);
          box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.15);
        }

        .fu-history-content-card {
          flex: 1;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 16px 20px;
          box-shadow: var(--shadow-sm);
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
        }

        .fu-history-content-card::after {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: var(--primary);
          opacity: 0.6;
        }

        .fu-history-item:hover .fu-history-content-card {
          transform: translateX(4px);
          border-color: var(--primary-soft);
          box-shadow: var(--shadow-md);
        }

        .fu-history-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .fu-h-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .fu-h-type {
          font-size: 0.75rem;
          font-weight: 800;
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .fu-h-date {
          font-size: 0.75rem;
          color: var(--text-dimmed);
          font-weight: 600;
        }

        .fu-h-status-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 800;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          color: var(--text);
          text-transform: uppercase;
        }

        .fu-h-outcome {
          font-size: 0.85rem;
          color: var(--text);
          font-weight: 700;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .fu-h-note-box {
          background: var(--bg-surface);
          border-radius: 10px;
          padding: 12px;
          border: 1px solid var(--border-strong);
        }

        .fu-h-note {
          font-size: 0.85rem;
          color: var(--text-dimmed);
          line-height: 1.6;
          margin: 0;
          font-style: italic;
        }

        .fu-h-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid var(--border);
        }

        .fu-h-pag-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          color: var(--text);
          cursor: pointer;
          transition: all 0.2s;
        }

        .fu-h-pag-btn:hover:not(:disabled) {
          border-color: var(--primary);
          color: var(--primary);
          background: var(--primary-soft);
        }

        .fu-h-pag-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .fu-h-pag-info {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-dimmed);
        }

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

        .fu-error-msg { color: #ef4444; font-size: 0.8rem; font-weight: 600; text-align: center; }
      `}</style>
    </div>
  )

  return createPortal(modalContent, document.body)
}
