import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import PageHeader from '../../../components/PageHeader.jsx'
import Timeline from '../../../components/Timeline.jsx'
import { Icon } from '../../../layouts/icons.jsx'
import { useAuth } from '../../../context/AuthContext'
import { leadsApi } from '../../../services/leads.js'
import { statusesApi } from '../../../services/statuses.js'
import { confirmToast } from '../../../utils/confirmToast.jsx'
import { useToastFeedback } from '../../../utils/useToastFeedback.js'
import FollowupModal from '../../../components/FollowupModal.jsx'
import LeadConversionModal from '../components/LeadConversionModal.jsx'

function displayValue(value, fallback = '—') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function formatDateTime(value, fallback = '—') {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatShortDate(value, fallback = '—') {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
}

function getFollowupBucket(value) {
  if (!value) return 'none'
  const due = new Date(value)
  if (Number.isNaN(due.getTime())) return 'none'

  const dueDay = new Date(due)
  dueDay.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (dueDay < today) return 'overdue'
  if (dueDay.getTime() === today.getTime()) return 'today'
  return 'future'
}

function stripHtml(html) {
  if (!html) return ''
  const tmp = document.createElement('DIV')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

export default function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()

  const [lead, setLead] = useState(null)
  const [activeTab, setActiveTab] = useState('info')
  const [statusOptions, setStatusOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [isFollowupOpen, setIsFollowupOpen] = useState(false)
  const [followupLead, setFollowupLead] = useState(null)
  const [isConversionOpen, setIsConversionOpen] = useState(false)

  useToastFeedback({ error })

  useEffect(() => {
    statusesApi
      .list('lead')
      .then((res) =>
        setStatusOptions(
          (Array.isArray(res) ? res : []).map((s) => ({ value: s.name, label: s.name, color: s.color })),
        ),
      )
      .catch(() => {})
  }, [])

  const statusColorByName = useMemo(() => {
    const map = new Map()
    statusOptions.forEach((opt) => {
      if (opt?.value) map.set(String(opt.value).toLowerCase(), opt.color || '')
    })
    return map
  }, [statusOptions])

  useEffect(() => {
    let canceled = false
    setLoading(true)
    setError('')

    leadsApi
      .get(id)
      .then((data) => {
        if (canceled) return
        setLead(data)
      })
      .catch((e) => {
        if (canceled) return
        setError(e.message || 'Lead not found')
      })
      .finally(() => {
        if (canceled) return
        setLoading(false)
      })

    return () => {
      canceled = true
    }
  }, [id])

  const isOwner =
    String(lead?.assignedTo?.id || lead?.assignedTo?._id || '') === String(currentUser?.id || currentUser?._id || '')
  const canEdit = currentUser?.role === 'Admin' || currentUser?.role === 'Manager' || isOwner
  const canDelete = currentUser?.role === 'Admin'

  async function onDelete() {
    if (!canDelete) return toast.error('Only Admins can delete leads')
    const confirmed = await confirmToast('Are you sure you want to move this lead to trash?', {
      confirmLabel: 'Move to Trash',
      type: 'danger',
    })
    if (!confirmed) return

    try {
      await leadsApi.remove(id)
      toast.success('Lead moved to trash')
      navigate('/leads', { replace: true })
    } catch (e) {
      setError(e.message || 'Delete failed')
    }
  }

  const followupBucket = getFollowupBucket(lead?.nextFollowupDate)
  const createdLabel = formatDateTime(lead?.created_at)

  const leadStatusKey = String(lead?.status || '').toLowerCase()
  const statusPillClass =
    leadStatusKey.includes('converted') || leadStatusKey.includes('won')
      ? 'badge-success-vibrant'
      : leadStatusKey.includes('lost')
        ? 'badge-danger-vibrant'
        : 'badge-muted-vibrant'

  const followupMetaChipClass =
    followupBucket === 'overdue'
      ? 'badge-danger-vibrant'
      : followupBucket === 'today'
        ? 'badge-warning-vibrant'
        : 'hero-meta-chip'

  const nextFollowupLabel = lead?.nextFollowupDate ? formatShortDate(lead.nextFollowupDate, '—') : '—'

  const openFollowup = () => {
    if (!lead) return
    setFollowupLead(lead)
    setIsFollowupOpen(true)
  }

  function onConvert() {
    if (!lead) return
    if (!canEdit) return toast.error('You do not have permission to convert this lead')
    setIsConversionOpen(true)
  }

  const handleConverted = (customer) => {
    const customerId = customer.id || customer._id
    if (customerId && currentUser?.role !== 'Employee') {
      navigate(`/customers/${customerId}`)
    } else {
      // Reload lead to show converted status
      leadsApi.get(id).then(setLead)
    }
  }

  const handleFollowupSaved = (updatedLead) => {
    if (!updatedLead) return
    setLead((prev) => {
      if (!prev) return updatedLead
      return { ...prev, ...updatedLead }
    })
  }

  if (loading) {
    return (
      <div className="center padding40 stack gap-20">
        <div className="spinner-medium" />
        <span className="muted">Loading lead detail...</span>
      </div>
    )
  }

  if (error && !lead) {
    return (
      <div className="center padding40 stack gap-20">
        <div className="alert error">{error}</div>
        <button className="btn secondary" onClick={() => navigate('/leads')}>
          Back to list
        </button>
      </div>
    )
  }

  if (!lead) return <div className="muted center padding40">Lead not found.</div>

  const isConverted = String(lead?.status || '').toLowerCase() === 'converted'

  return (
    <div className="crm-fullscreen-shell crm-detail-container">
      <PageHeader
        title="Lead Details"
        description={lead.name}
        backTo="/leads"
        actions={
          <div className="control-bar-premium">
            <button className="btn-premium action-info" type="button" onClick={openFollowup}>
              <Icon name="phone" />
              <span>Log Follow-up</span>
            </button>
            {canEdit && !isConverted ? (
              <button className="btn-premium action-vibrant" type="button" onClick={onConvert} disabled={converting}>
                <Icon name="check" />
                <span>{converting ? 'Converting...' : 'Convert to Customer'}</span>
              </button>
            ) : null}
            {canEdit ? (
              <Link className="btn-premium action-secondary" to={`/leads/${lead.id || lead._id}/edit`}>
                <Icon name="edit" />
                <span>Edit Lead</span>
              </Link>
            ) : null}
          </div>
        }
      />

      <section className="crm-hero-shell">
        <div className="crm-hero-glow crm-hero-glow-1" />
        <div className="crm-hero-glow crm-hero-glow-2" />

        <div className="crm-hero-topline">
          <span className={`status-pill ${statusPillClass}`}>{displayValue(lead.status, 'Active')}</span>
          <span className="hero-meta-chip">Lead ID: {lead.leadId || lead.readable_id || lead._id}</span>
          {lead.nextFollowupDate ? (
            <span className={`status-pill ${followupMetaChipClass}`}>
              Follow-up {followupBucket === 'overdue' ? 'Overdue' : followupBucket === 'today' ? 'Due Today' : 'Scheduled'} • {nextFollowupLabel}
            </span>
          ) : null}
        </div>

        <div className="crm-hero-main-row">
          <div className="crm-hero-avatar" aria-hidden="true">
            <Icon name="users" size={48} />
          </div>

          <div className="crm-hero-copy">
            <h1 className="crm-hero-name">{displayValue(lead.name, 'Unnamed Lead')}</h1>
            <div className="crm-hero-subline">
              <div className="crm-hero-subline-item">
                <Icon name="user" />
                <span>Assigned to: {lead.assignedTo?.name || 'Unassigned'}</span>
              </div>
              <div className="crm-hero-divider" />
              <div className="crm-hero-subline-item">
                <Icon name="mail" />
                <span>{lead.email || 'No email'}</span>
              </div>
              {lead.phone ? (
                <>
                  <div className="crm-hero-divider" />
                  <div className="crm-hero-subline-item">
                    <Icon name="phone" />
                    <span>{lead.phone}</span>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div className="crm-hero-side-stack">
            <div className="crm-hero-stat-card vibrant-border">
              <span className="crm-hero-stat-label">Created Date</span>
              <span className="crm-hero-stat-value">{createdLabel}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="crm-hub-nav">
        {[
          { id: 'info', label: 'Details', icon: 'dashboard' },
          { id: 'followup', label: 'Follow-up Hub', icon: 'bell' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`crm-hub-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            <Icon name={tab.icon} size={14} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="crm-detail-grid">
        <div className="crm-detail-main">
          {activeTab === 'info' && (
            <section className="crm-detail-card">
              <div className="crm-detail-card-header">
                <div className="crm-detail-card-title">
                  <Icon name="info" />
                  <h3>Lead Summary</h3>
                </div>
              </div>
              <div className="crm-detail-card-body">
                <div className="crm-intel-grid">
                  <div className="crm-intel-field">
                    <label>Full Name</label>
                    <div className="crm-intel-value">{displayValue(lead.name)}</div>
                  </div>
                  <div className="crm-intel-field">
                    <label>Status</label>
                    <div className="crm-intel-value highlight">{lead.status}</div>
                  </div>
                  <div className="crm-intel-field">
                    <label>Lead Source</label>
                    <div className="crm-intel-value">{displayValue(lead.source)}</div>
                  </div>
                  <div className="crm-intel-field">
                    <label>Priority</label>
                    <div className="crm-intel-value">{displayValue(lead.priority)}</div>
                  </div>
                  <div className="crm-intel-field full-width">
                    <label>Company Name</label>
                    <div className="crm-intel-value">{displayValue(lead.company, 'Not specified')}</div>
                  </div>
                  <div className="crm-intel-field full-width">
                    <label>General Notes</label>
                    <div className="crm-intel-value" style={{ fontSize: '0.95rem', fontWeight: 400, opacity: 0.8, lineHeight: 1.6 }}>
                      {stripHtml(lead.followupNote) || 'No notes added.'}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'followup' && (
            <section className="crm-detail-card">
              <div className="crm-detail-card-header">
                <div className="crm-detail-card-title">
                  <Icon name="bell" />
                  <h3>Follow-up Hub</h3>
                </div>
              </div>
              <div className="crm-detail-card-body">
                <div className="milestone-panel">
                  <div className="milestone-label">Next Follow-up Date</div>
                  <div className="milestone-value highlight">
                    {lead.nextFollowupDate ? nextFollowupLabel : 'No follow-up set'}
                  </div>
                </div>
                <div className="crm-intel-field full-width">
                  <label>Notes for next step</label>
                  <div className="crm-intel-value">{stripHtml(lead.followupNote) || 'No notes for the next step.'}</div>
                </div>
                <div className="stack gap-16 margin-top-24">
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-dimmed)' }}>Follow-up History</h4>
                  <Timeline relatedId={lead.id || lead._id} relatedType="Lead" defaultView="table" />
                </div>
              </div>
            </section>
          )}
        </div>

        <aside className="crm-detail-side">
          <section className="crm-detail-card accent-card">
            <div className="crm-detail-card-header">
              <div className="crm-detail-card-title">
                <Icon name="bell" />
                <h3>Quick Actions</h3>
              </div>
            </div>
            <div className="crm-detail-card-body">
              <div className="milestone-panel">
                <div className="milestone-label">Next Follow-up</div>
                <div className="milestone-value highlight">
                  {lead.nextFollowupDate ? nextFollowupLabel : 'Not Set'}
                </div>
              </div>

              <div className="snapshot-list">
                <div className="snapshot-row">
                  <span className="snapshot-label">Lead Owner</span>
                  <span className="snapshot-value">{lead.assignedTo?.name || 'Unassigned'}</span>
                </div>
                <div className="snapshot-row">
                  <span className="snapshot-label">Contact Info</span>
                  <span className="snapshot-value">{lead.phone || lead.email || '—'}</span>
                </div>
              </div>

              <button className="btn-modern-vibrant full-width" onClick={openFollowup}>
                <Icon name="plus" />
                <span>Log New Follow-up</span>
              </button>
            </div>
          </section>
        </aside>
      </div>

      <FollowupModal
        isOpen={isFollowupOpen}
        lead={followupLead}
        onClose={() => {
          setIsFollowupOpen(false)
          setFollowupLead(null)
        }}
        onSave={handleFollowupSaved}
      />

      <LeadConversionModal
        isOpen={isConversionOpen}
        lead={lead}
        onClose={() => setIsConversionOpen(false)}
        onConverted={handleConverted}
      />
    </div>
  )
}

function formatDate(value, fallback = 'Not available') {
  if (!value) return fallback
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return fallback
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return fallback
  }
}

function getCountdown(date) {
  if (!date) return null
  const target = new Date(date)
  const now = new Date()
  const diffMs = target - now
  const isOverdue = diffMs < 0
  const absDiff = Math.abs(diffMs)

  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const mins = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60))

  if (isOverdue) {
    return days > 0 ? `Overdue by ${days}d` : hours > 0 ? `Overdue by ${hours}h` : `Overdue by ${mins}m`
  }
  return days > 0 ? `Due in ${days}d` : hours > 0 ? `Due in ${hours}h` : `Due in ${mins}m`
}
