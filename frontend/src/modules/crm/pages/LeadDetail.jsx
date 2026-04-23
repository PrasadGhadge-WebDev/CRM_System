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

export default function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()

  const [lead, setLead] = useState(null)
  const [statusOptions, setStatusOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [isFollowupOpen, setIsFollowupOpen] = useState(false)
  const [followupLead, setFollowupLead] = useState(null)
  const [converting, setConverting] = useState(false)

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
  const followupCountdown = lead?.nextFollowupDate ? getCountdown(lead.nextFollowupDate) : null

  const statusColor = statusColorByName.get(String(lead?.status || '').toLowerCase()) || ''

  const openFollowup = () => {
    if (!lead) return
    setFollowupLead(lead)
    setIsFollowupOpen(true)
  }

  async function onConvert() {
    if (!lead) return
    if (!canEdit) return toast.error('You do not have permission to convert this lead')

    const confirmed = await confirmToast('Convert this lead to a Customer profile?', {
      confirmLabel: 'Convert',
      type: 'primary',
    })
    if (!confirmed) return

    setConverting(true)
    try {
      const updated = await leadsApi.updateStatus(id, 'Converted')
      setLead(updated)
      toast.success('Lead converted successfully')

      const customerId =
        updated?.convertedCustomerId?.id ||
        updated?.convertedCustomerId?._id ||
        updated?.convertedCustomerId

      // Employees often don't have Customers permission, so avoid hard navigation for them.
      if (customerId && currentUser?.role !== 'Employee') {
        navigate(`/customers/${customerId}`)
      }
    } catch (e) {
      setError(e.message || 'Conversion failed')
    } finally {
      setConverting(false)
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
    <div className="stack gap-32 lead-profile-container">
      <PageHeader
        title="Lead Profile"
        backTo="/leads"
        actions={
          <div className="control-bar-premium">
            <button className="btn-premium action-info" type="button" onClick={openFollowup}>
              <Icon name="phone" />
              <span>Follow-up</span>
            </button>
            {canEdit && !isConverted ? (
              <button className="btn-premium action-info" type="button" onClick={onConvert} disabled={converting}>
                <Icon name="check" />
                <span>{converting ? 'Converting...' : 'Convert'}</span>
              </button>
            ) : null}
            {canEdit ? (
              <Link className="btn-premium action-secondary" to={`/leads/${lead.id || lead._id}/edit`}>
                <Icon name="edit" />
                <span>Edit</span>
              </Link>
            ) : null}
            {canDelete ? (
              <button className="btn-premium action-danger" type="button" onClick={onDelete}>
                <Icon name="trash" />
                <span>Delete</span>
              </button>
            ) : null}
          </div>
        }
      />

      {error ? <div className="alert error">{error}</div> : null}

      {/* Hero Shell (matches User view style) */}
      <section className="user-hero-shell">
        <div className="hero-glow hero-glow-a" />
        <div className="hero-glow hero-glow-b" />

        <div className="hero-topline">
          <span className={`status-pill ${statusPillClass}`}>{displayValue(lead.status, 'Active')}</span>
          <span className="hero-meta-chip">Lead since {formatDate(lead.created_at)}</span>
          {lead.nextFollowupDate ? (
            <span className={`status-pill ${followupMetaChipClass}`}>
              {followupBucket === 'overdue' ? 'Overdue' : followupBucket === 'today' ? 'Today' : 'Next'} • {nextFollowupLabel}
            </span>
          ) : null}
        </div>

        <div className="hero-main-row">
          <div className="hero-avatar-modern" aria-hidden="true">
            {(lead?.name || 'L').charAt(0).toUpperCase()}
          </div>

          <div className="hero-copy">
            <h1 className="hero-name-modern">{displayValue(lead.name, 'Unnamed Lead')}</h1>
            <div className="hero-subline">
              <div className="hero-subline-item">
                <Icon name="users" />
                <span>{lead.assignedTo?.name || 'Unassigned'}</span>
              </div>
              <div className="hero-divider" />
              <div className="hero-subline-item">
                <Icon name="mail" />
                <span>{lead.email || 'No email'}</span>
              </div>
              {lead.phone ? (
                <>
                  <div className="hero-divider" />
                  <div className="hero-subline-item">
                    <Icon name="phone" />
                    <span>{lead.phone}</span>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div className="hero-side-stack">
            <div className="hero-stat-card">
              <span className="hero-stat-label">Created</span>
              <span className="hero-stat-value">{createdLabel}</span>
            </div>
            <div className="hero-stat-card">
              <span className="hero-stat-label">Next follow-up</span>
              <span className="hero-stat-value">{lead.nextFollowupDate ? `${nextFollowupLabel}${followupCountdown ? ` • ${followupCountdown}` : ''}` : '—'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Detail Grid (matches User view style) */}
      <div className="user-detail-grid">
        <div className="user-detail-main">
          <section className="detail-card">
            <div className="detail-card-header">
              <div className="detail-card-title">
                <Icon name="users" />
                <h3>Basic Information</h3>
              </div>
              <span className="detail-card-badge">Core record</span>
            </div>
            <div className="detail-card-body detail-grid-2">
              <div className="intel-field">
                <label>Name</label>
                <div className="intel-value">{displayValue(lead.name)}</div>
              </div>
              <div className="intel-field">
                <label>Status</label>
                <div className="intel-value">
                  {lead.status ? (
                    <span className="status-pill badge-muted-vibrant" style={{ border: `1px solid ${statusColor || 'rgba(148,163,184,0.25)'}` }}>
                      {lead.status}
                    </span>
                  ) : (
                    '—'
                  )}
                </div>
              </div>
              <div className="intel-field">
                <label>Assigned User</label>
                <div className="intel-value">{displayValue(lead.assignedTo?.name, 'Unassigned')}</div>
              </div>
              <div className="intel-field">
                <label>Created Date</label>
                <div className="intel-value highlight">{createdLabel}</div>
              </div>
            </div>
          </section>

          <section className="detail-card">
            <div className="detail-card-header">
              <div className="detail-card-title">
                <Icon name="phone" />
                <h3>Contact Details</h3>
              </div>
              <span className="detail-card-badge subtle">Contact</span>
            </div>
            <div className="detail-card-body detail-grid-2">
              <div className="intel-field">
                <label>Phone</label>
                <div className="intel-value">{displayValue(lead.phone)}</div>
              </div>
              <div className="intel-field">
                <label>Email</label>
                <div className="intel-value">{displayValue(lead.email)}</div>
              </div>
              <div className="intel-field full-width">
                <label>Company</label>
                <div className="intel-value">{displayValue(lead.company, 'Individual')}</div>
              </div>
            </div>
          </section>

          <section className="detail-card">
            <div className="detail-card-header">
              <div className="detail-card-title">
                <Icon name="info" />
                <h3>Additional Info</h3>
              </div>
              <span className="detail-card-badge subtle">Metadata</span>
            </div>
            <div className="detail-card-body detail-grid-2">
              <div className="intel-field">
                <label>Source</label>
                <div className="intel-value">{displayValue(lead.source)}</div>
              </div>
              <div className="intel-field">
                <label>Priority</label>
                <div className="intel-value">{displayValue(lead.priority)}</div>
              </div>
              <div className="intel-field full-width">
                <label>Lead ID</label>
                <div className="intel-value">{displayValue(lead.leadId || lead.readable_id || lead._id)}</div>
              </div>
            </div>
          </section>

          <section className="detail-card">
            <div className="detail-card-header">
              <div className="detail-card-title">
                <Icon name="bell" />
                <h3>Follow-up Information</h3>
              </div>
              <span className="detail-card-badge subtle">Next steps</span>
            </div>
            <div className="detail-card-body detail-grid-2">
              <div className="intel-field">
                <label>Last Contact Date</label>
                <div className="intel-value">{formatShortDate(lead.lastContactDate, '—')}</div>
              </div>
              <div className="intel-field">
                <label>Next Follow-up</label>
                <div className="intel-value">
                  {lead.nextFollowupDate ? (
                    <span
                      className={`status-pill ${
                        followupBucket === 'overdue'
                          ? 'badge-danger-vibrant'
                          : followupBucket === 'today'
                            ? 'badge-warning-vibrant'
                            : 'badge-muted-vibrant'
                      }`}
                    >
                      {followupBucket === 'overdue' ? 'Overdue' : followupBucket === 'today' ? 'Today' : 'Upcoming'} • {nextFollowupLabel}
                    </span>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </div>
              </div>
              <div className="intel-field full-width">
                <label>Notes</label>
                <div className="intel-value">{displayValue(lead.followupNote)}</div>
              </div>
            </div>
          </section>

          <section className="detail-card">
            <div className="detail-card-header">
              <div className="detail-card-title">
                <Icon name="reports" />
                <h3>Lead Activity History</h3>
              </div>
              <span className="detail-card-badge subtle">Timeline</span>
            </div>
            <div className="detail-card-body">
              <Timeline relatedId={lead.id || lead._id} relatedType="Lead" />
            </div>
          </section>
        </div>

        <aside className="user-detail-side">
          <section className="detail-card accent-card">
            <div className="detail-card-header">
              <div className="detail-card-title">
                <Icon name="users" />
                <h3>Lead Snapshot</h3>
              </div>
              <span className="detail-card-badge success">Live data</span>
            </div>
            <div className="detail-card-body">
              <div className="milestone-panel">
                <div className="milestone-label">Assigned to</div>
                <div className="milestone-value">{lead.assignedTo?.name || 'Unassigned'}</div>
              </div>

              <div className="snapshot-list">
                <div className="snapshot-row">
                  <span className="snapshot-label">Status</span>
                  <span className="snapshot-value">{displayValue(lead.status, 'Active')}</span>
                </div>
                <div className="snapshot-row">
                  <span className="snapshot-label">Source</span>
                  <span className="snapshot-value">{displayValue(lead.source, '—')}</span>
                </div>
                <div className="snapshot-row">
                  <span className="snapshot-label">Next follow-up</span>
                  <span className="snapshot-value">{lead.nextFollowupDate ? nextFollowupLabel : '—'}</span>
                </div>
                <div className="snapshot-row">
                  <span className="snapshot-label">Created</span>
                  <span className="snapshot-value">{formatShortDate(lead.created_at, '—')}</span>
                </div>
              </div>

              {canEdit ? (
                <Link to={`/leads/${lead.id || lead._id}/edit`} className="converted-link-premium">
                  <div className="link-icon">
                    <Icon name="edit" />
                  </div>
                  <div className="link-text">
                    <strong>Edit this lead</strong>
                    <span>Update status, owner, or details</span>
                  </div>
                </Link>
              ) : null}
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

      <style>{`
        .lead-profile-container { padding-bottom: 60px; }

        .control-bar-premium { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
        .btn-premium { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 12px; font-weight: 700; font-size: 0.88rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid transparent; cursor: pointer; text-decoration: none; }
        .action-secondary { background: var(--bg-surface); color: var(--text-muted); border-color: var(--border); }
        .action-danger { background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: rgba(239, 68, 68, 0.2); }
        .action-info { background: rgba(14, 165, 233, 0.1); color: #0ea5e9; border-color: rgba(14, 165, 233, 0.2); }
        .btn-premium:hover { transform: translateY(-2px); filter: brightness(1.05); }

        .user-hero-shell { position: relative; overflow: hidden; background: radial-gradient(circle at top left, rgba(99, 102, 241, 0.15), transparent 40%), linear-gradient(135deg, rgba(17, 24, 39, 0.98), rgba(15, 23, 42, 0.95)); border: 1px solid var(--border); border-radius: 32px; padding: 32px; box-shadow: var(--shadow-xl); backdrop-filter: blur(14px); }
        .hero-glow { position: absolute; border-radius: 999px; filter: blur(40px); pointer-events: none; opacity: 0.5; }
        .hero-glow-a { top: -80px; left: -40px; width: 300px; height: 300px; background: rgba(59, 130, 246, 0.2); }
        .hero-glow-b { right: -70px; bottom: -100px; width: 350px; height: 350px; background: rgba(99, 102, 241, 0.15); }

        .hero-topline { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; position: relative; z-index: 1; flex-wrap: wrap; }
        .status-pill, .hero-meta-chip { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.04em; padding: 7px 14px; text-transform: uppercase; }
        .badge-success-vibrant { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
        .badge-danger-vibrant { background: rgba(239, 68, 68, 0.12); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.28); }
        .badge-warning-vibrant { background: rgba(245, 158, 11, 0.12); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.28); }
        .badge-muted-vibrant { background: rgba(148, 163, 184, 0.12); color: rgba(255, 255, 255, 0.7); border: 1px solid rgba(148, 163, 184, 0.25); }
        .hero-meta-chip { background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.85); border: 1px solid rgba(255, 255, 255, 0.15); }

        .hero-main-row { display: flex; align-items: center; gap: 32px; justify-content: space-between; position: relative; z-index: 1; }
        .hero-avatar-modern { width: 100px; height: 100px; flex: 0 0 auto; background: linear-gradient(135deg, #4f46e5, #9333ea); border-radius: 30px; border: 2px solid rgba(255, 255, 255, 0.1); display: flex; align-items: center; justify-content: center; font-size: 3.2rem; font-weight: 900; color: white; box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4); overflow: hidden; }
        .hero-copy { min-width: 0; }
        .hero-name-modern { margin: 0 0 12px; font-size: clamp(2rem, 4vw, 3.2rem); line-height: 1; letter-spacing: -0.04em; color: white; font-weight: 900; }
        .hero-subline { display: flex; align-items: center; flex-wrap: wrap; gap: 16px; }
        .hero-subline-item { display: inline-flex; align-items: center; gap: 8px; color: rgba(255, 255, 255, 0.75); font-size: 0.95rem; font-weight: 500; }
        .hero-subline-item svg { color: var(--primary); width: 18px; }
        .hero-divider { width: 1px; height: 14px; background: rgba(255, 255, 255, 0.1); }

        .hero-side-stack { display: grid; gap: 14px; min-width: 280px; grid-template-columns: 1fr; }
        .hero-stat-card { padding: 16px 18px; border-radius: 18px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.24); }
        .hero-stat-label { display: block; color: rgba(255, 255, 255, 0.72); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; margin-bottom: 6px; }
        .hero-stat-value { color: white; font-weight: 700; line-height: 1.3; word-break: break-word; text-shadow: 0 1px 0 rgba(0, 0, 0, 0.2); }

        .user-detail-grid { display: flex; gap: 24px; align-items: start; }
        .user-detail-main { display: grid; gap: 24px; flex: 1 1 auto; min-width: 0; }
        .user-detail-side { width: 360px; flex: 0 0 auto; position: sticky; top: 96px; }

        .detail-card { background: var(--bg-surface); border: 1px solid rgba(148, 163, 184, 0.38); border-radius: 24px; overflow: hidden; box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08); }
        .detail-card-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 22px 24px; border-bottom: 1px solid rgba(148, 163, 184, 0.3); background: rgba(255, 255, 255, 0.06); }
        .detail-card-title { display: flex; align-items: center; gap: 12px; }
        .detail-card-title h3 { margin: 0; font-size: 1.05rem; font-weight: 800; }
        .detail-card-title svg { color: var(--primary); }
        .detail-card-body { padding: 24px; }

        .detail-card-badge { display: inline-flex; align-items: center; justify-content: center; padding: 6px 12px; border-radius: 999px; font-size: 0.7rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.14); color: rgba(255, 255, 255, 0.82); }
        .detail-card-badge.success { background: rgba(16, 185, 129, 0.1); color: #10b981; border-color: rgba(16, 185, 129, 0.2); }
        .detail-card-badge.subtle { background: rgba(59, 130, 246, 0.08); color: #93c5fd; border-color: rgba(59, 130, 246, 0.18); }

        .detail-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px; }
        .intel-field label { display: block; font-size: 0.75rem; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.06em; }
        .intel-value { font-size: 1.05rem; font-weight: 600; color: var(--text); word-break: break-word; }
        .intel-value.highlight { color: var(--primary); }
        .full-width { grid-column: 1 / -1; }

        .accent-card { background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, var(--bg-surface) 100%); }
        .milestone-panel { margin-bottom: 18px; padding: 20px; background: rgba(255, 255, 255, 0.08); border-radius: 18px; text-align: center; border: 1px solid rgba(255, 255, 255, 0.3); }
        .milestone-label { font-size: 0.8rem; font-weight: 700; color: var(--text-dimmed); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.08em; }
        .milestone-value { font-size: 1.2rem; font-weight: 900; color: var(--primary); line-height: 1.25; text-transform: capitalize; }

        .snapshot-list { display: grid; gap: 12px; margin-bottom: 18px; }
        .snapshot-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 16px; border-radius: 14px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.24); }
        .snapshot-label { font-size: 0.75rem; color: rgba(255, 255, 255, 0.68); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; }
        .snapshot-value { color: rgba(255, 255, 255, 0.94); font-weight: 700; text-align: right; word-break: break-word; text-transform: capitalize; }

        .converted-link-premium { display: flex; align-items: center; gap: 16px; background: var(--bg-elevated); padding: 16px; border-radius: 16px; border: 1px solid rgba(148, 163, 184, 0.34); text-decoration: none; transition: all 0.2s ease; }
        .converted-link-premium:hover { border-color: var(--primary); transform: translateX(4px); }
        .link-icon { color: var(--primary); }
        .link-text { display: flex; flex-direction: column; gap: 2px; }
        .link-text strong { color: var(--text); font-size: 0.95rem; }
        .link-text span { color: var(--text-muted); font-size: 0.8rem; }

        @media (max-width: 1024px) {
          .user-detail-grid { flex-direction: column; }
          .user-detail-side { width: 100%; position: static; }
          .hero-main-row { flex-direction: column; align-items: flex-start; }
          .hero-side-stack { width: 100%; min-width: 0; grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-width: 768px) {
          .user-hero-shell { padding: 20px; }
          .hero-side-stack { grid-template-columns: 1fr; }
          .hero-divider { display: none; }
          .detail-grid-2 { grid-template-columns: 1fr; }
          .full-width { grid-column: span 1; }
          .detail-card-header, .detail-card-body { padding-left: 18px; padding-right: 18px; }
        }
      `}</style>
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
