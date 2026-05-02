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
        <span className="muted">Loading lead...</span>
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
    <div className="user-profile-container" style={{ background: 'var(--bg)', minHeight: '100vh', padding: '32px' }}>
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Link to="/leads" className="back-btn-modern">
          <Icon name="chevron-left" size={18} />
          <span>Back to List</span>
        </Link>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="crm-btn-premium" onClick={openFollowup} style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', padding: '8px 16px', fontSize: '0.85rem', boxShadow: 'var(--shadow-sm)', borderRadius: '8px' }}>
            <Icon name="phone" />
            <span>Add Activity</span>
          </button>
          {canEdit && !isConverted && (
            <button className="crm-btn-premium" onClick={onConvert} style={{ background: 'var(--success)', color: '#ffffff', border: 'none', padding: '8px 16px', fontSize: '0.85rem', boxShadow: 'var(--shadow-sm)', borderRadius: '8px' }}>
              <Icon name="check" />
              <span>Convert</span>
            </button>
          )}
          {canEdit && (
            <Link className="crm-btn-premium" to={`/leads/${lead.id || lead._id}/edit`} style={{ background: 'var(--primary)', color: '#ffffff', padding: '8px 24px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
              <Icon name="edit" />
              <span>Edit Lead</span>
            </Link>
          )}
        </div>
      </div>

      {/* Profile Header Card */}
      <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '32px', marginBottom: '24px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700, flexShrink: 0, boxShadow: 'inset 0 0 0 1px var(--primary-soft)' }}>
             {(lead.name || 'L').split(' ').map(n => n[0]).join('').toUpperCase()}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>{lead.name}</h1>
              <span style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', padding: '2px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid var(--border)' }}>
                {lead.status}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600, marginLeft: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} />
                <span>Current</span>
              </div>
              {isConverted && (
                <Link 
                  to={`/customers/${lead.convertedCustomerId?._id || lead.convertedCustomerId?.id || lead.convertedCustomerId}`}
                  className="crm-status-pill-modern status-active"
                  style={{ textDecoration: 'none' }}
                >
                  <Icon name="user" size={12} />
                  <span>View Customer Profile</span>
                </Link>
              )}
            </div>

            <div style={{ display: 'flex', gap: '20px', color: 'var(--text-dimmed)', fontSize: '0.9rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="mail" size={14} />
                <span>{lead.email || 'No email'}</span>
              </div>
              {lead.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name="phone" size={14} />
                  <span>{lead.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--border)', margin: '24px 0' }} />

        {/* Time Stats Row */}
        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <Icon name="clock" size={16} style={{ color: 'var(--text-dimmed)' }} />
             <span style={{ fontSize: '0.9rem', color: 'var(--text-dimmed)' }}>Added On:</span>
             <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>{createdLabel}</span>
           </div>
           {lead.nextFollowupDate && (
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               <Icon name="clock" size={16} style={{ color: 'var(--text-dimmed)' }} />
               <span style={{ fontSize: '0.9rem', color: 'var(--text-dimmed)' }}>Next Follow-up:</span>
               <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary)' }}>{nextFollowupLabel}</span>
             </div>
           )}
        </div>
      </section>

      {/* Main Grid */}
      <div className="crm-profile-grid-desktop" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        {/* Lead Details Card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Details</h3>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Full Name</label>
                <div style={{ color: 'var(--text)', fontWeight: 500 }}>{displayValue(lead.name)}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Company</label>
                <div style={{ color: 'var(--text)', fontWeight: 500 }}>{displayValue(lead.company)}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Source</label>
                <div style={{ color: 'var(--text)', fontWeight: 500 }}>{displayValue(lead.source)}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Priority</label>
                <div style={{ color: lead.priority === 'High' ? 'var(--danger)' : 'var(--text)', fontWeight: 700 }}>{displayValue(lead.priority)}</div>
              </div>
            </div>
            {lead.followupNote && (
              <div style={{ marginTop: '20px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Notes</label>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>{stripHtml(lead.followupNote)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Account Snapshot Table Card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Summary</h3>
          </div>
          <div style={{ padding: '0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border)' }}>
              <div style={{ padding: '20px 24px', borderRight: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dimmed)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🧑💼</span> Assigned To
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>{lead.assignedTo?.name || 'Unassigned'}</div>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dimmed)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🔌</span> Status
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontWeight: 700 }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }} />
                  Current
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ padding: '20px 24px', borderRight: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dimmed)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📅</span> Added On
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>{formatDate(lead.created_at)}</div>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dimmed)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⏱️</span> Next Follow-up
                </div>
                <div style={{ fontWeight: 600, color: lead.nextFollowupDate ? 'var(--primary)' : 'var(--text)', fontSize: '0.85rem' }}>{nextFollowupLabel}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History Section */}
      <section style={{ marginTop: '32px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icon name="bell" size={18} style={{ color: 'var(--text-dimmed)' }} />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>History</h3>
        </div>
        <div style={{ padding: '24px' }}>
          <Timeline relatedId={lead.id || lead._id} relatedType="Lead" defaultView="table" />
        </div>
      </section>

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

      <style>{`
        @media (max-width: 900px) {
          .crm-profile-grid-desktop {
            grid-template-columns: 1fr !important;
          }
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
