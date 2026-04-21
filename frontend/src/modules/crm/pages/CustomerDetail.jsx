import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { customersApi } from '../../../services/customers.js'
import { dealsApi } from '../../../services/deals.js'
import { workflowApi } from '../../../services/workflow.js'
import Timeline from '../../../components/Timeline.jsx'
import AttachmentManager from '../../../components/AttachmentManager.jsx'
import PageHeader from '../../../components/PageHeader.jsx'
import { Icon } from '../../../layouts/icons.jsx'
import { useToastFeedback } from '../../../utils/useToastFeedback.js'
import { useAuth } from '../../../context/AuthContext.jsx'
import InteractionLogger from '../../../components/InteractionLogger.jsx'

export default function CustomerDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin'
  const isManager = user?.role === 'Manager'
  const [customer, setCustomer] = useState(null)
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [timelineKey, setTimelineKey] = useState(0)
  useToastFeedback({ error })

  useEffect(() => {
    let canceled = false
    setLoading(true)
    setError('')
    Promise.all([
      customersApi.get(id),
      dealsApi.list({ customer_id: id }),
    ])
      .then(([c, d]) => {
        if (canceled) return
        setCustomer(c)
        setDeals(Array.isArray(d) ? d : d.items || [])
      })
      .catch((e) => {
        if (canceled) return
        setError(e.message || 'Failed to load customer details')
      })
      .finally(() => {
        if (canceled) return
        setLoading(false)
      })
    return () => {
      canceled = true
    }
  }, [id])


  async function handleCreateTicket() {
    const subject = prompt('Enter ticket subject:')
    if (!subject) return
    try {
      await workflowApi.createSupportTicket({
        customerId: id,
        subject,
        description: 'New ticket from customer detail page',
        priority: 'medium',
      })
      toast.success('Support ticket created successfully')
    } catch {
      setError('Ticket creation failed')
    }
  }

  if (loading) return <div className="muted">Loading...</div>
  if (error) return <div className="alert error">{error}</div>
  if (!customer) return <div className="muted">Customer not found.</div>

  const isAssignedToMe = String(customer.assigned_to?.id || customer.assigned_to) === String(user?.id)
  const canModify = isManagement || isAssignedToMe

  return (
    <div className="stack gap-32 customer-profile-container">
      <PageHeader
        title="Client Intelligence"
        backTo="/customers"
        actions={
          (isManagement || (isEmployee && isAssignedToMe)) && (
            <div className="control-bar-premium">
              {isManagement && (
                <div className="manager-oversight-mini card glass-panel row align-center gap-15 padding-8-16 no-margin">
                   <div className="label-tiny muted">Satisfaction</div>
                   <div className="row gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Icon 
                          key={star} 
                          name="star" 
                          style={{ color: star <= (customer.satisfaction_score || 0) ? '#fbbf24' : 'rgba(255,255,255,0.1)', cursor: 'default' }}
                        />
                      ))}
                   </div>
                </div>
              )}
              {isManagement && (
                <Link className="btn-premium action-vibrant" to="/reports" title="Deep Analytics">
                   <Icon name="reports" />
                   <span>Full Analysis</span>
                </Link>
              )}
              {isManagement && (
                <Link className="btn-premium action-vibrant" to={`/deals/new?customer_id=${id}`}>
                  <Icon name="deals" />
                  <span>Start New Deal</span>
                </Link>
              )}
              <button className="btn-premium action-info" onClick={handleCreateTicket} type="button">
                <Icon name="bell" />
                <span>New Ticket</span>
              </button>
              {(isManagement || isAssignedToMe) && (
                <Link className="btn-premium action-secondary" to={`/customers/${customer.id}/edit`}>
                  <Icon name="edit" />
                  <span>Edit Profile</span>
                </Link>
              )}
              {isAdmin && (
                <button 
                  className="btn-premium action-danger" 
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to move this customer to trash?')) {
                      await customersApi.remove(id);
                      toast.success('Customer moved to trash');
                      window.location.href = '/customers';
                    }
                  }}
                  type="button"
                >
                  <Icon name="trash" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          )
        }
      />

      <section className="customer-hero-shell">
        <div className="hero-glow hero-glow-a" />
        <div className="hero-glow hero-glow-b" />

        <div className="hero-topline">
          <span className={`status-pill ${customer.status === 'Inactive' ? 'badge-danger-vibrant' : 'badge-success-vibrant'}`}>
            {customer.status || 'Active'}
          </span>
          <span className="hero-meta-chip">ID {customer.id.slice(-6).toUpperCase()}</span>
          <span className="hero-meta-chip">Type: {customer.customer_type || 'General'}</span>
        </div>

        <div className="hero-main-row">
          <div className="hero-avatar-modern" aria-hidden="true">
            {(customer.name || 'C').charAt(0).toUpperCase()}
          </div>

          <div className="hero-copy">
            <h1 className="hero-name-modern">{customer.name}</h1>
            <div className="hero-subline">
              <div className="hero-subline-item">
                <Icon name="mail" />
                <span>{customer.email || 'No email record'}</span>
              </div>
              <div className="hero-divider" />
              <div className="hero-subline-item">
                <Icon name="phone" />
                <span>{customer.phone || 'No phone record'}</span>
              </div>
              <div className="hero-divider" />
              <div className="hero-subline-item">
                <Icon name="dashboard" />
                <span>Managed by {customer.assigned_to?.name || 'Central Team'}</span>
              </div>
            </div>
          </div>

          <div className="hero-side-stack">
            <div className="hero-stat-card">
              <span className="hero-stat-label">Total Lifecycle Value</span>
              <span className="hero-stat-value">
                INR {deals.reduce((acc, d) => acc + (d.value || 0), 0).toLocaleString()}
              </span>
            </div>
            <div className="hero-stat-card">
              <span className="hero-stat-label">Global Territory</span>
              <span className="hero-stat-value">{customer.city || 'Undisclosed'}, {customer.country || 'IN'}</span>
            </div>
          </div>
        </div>
      </section>

      {isManagement && (
        <section className="card glass-panel padding32 manager-review-section">
           <div className="row justify-between align-center margin-bottom-20">
              <h3 className="section-title-premium margin0">Managerial Oversight</h3>
              <div className="muted small uppercase strong">Last Checked: {customer.last_review_date ? new Date(customer.last_review_date).toLocaleDateString() : 'Never'}</div>
           </div>
           <div className="grid2 gap32">
              <div className="stack gap10">
                 <label className="label-tiny muted">Management Strategy / Notes</label>
                 <textarea 
                   className="input-premium" 
                   rows="4" 
                   placeholder="Log high-level satisfaction checks or intervention plans here..."
                   defaultValue={customer.manager_notes}
                   readOnly
                 />
              </div>
              <div className="stack gap20">
                 <div className="stack gap5">
                    <label className="label-tiny muted">Current Satisfaction</label>
                    <div className="sentiment-meter-bar">
                       <div className="sentiment-fill" style={{ width: `${(customer.satisfaction_score || 5) * 20}%`, backgroundColor: (customer.satisfaction_score || 5) > 3 ? '#10b981' : (customer.satisfaction_score || 5) > 2 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                    <div className="row justify-between small muted">
                       <span>Critical</span>
                       <span>Neutral</span>
                       <span>Exemplary</span>
                    </div>
                 </div>
                 <div className="card padding16 bg-soft-info border-info row align-center gap-12">
                    <Icon name="bell" style={{ color: 'var(--info)' }} />
                    <div className="small muted">Only Managers and Administrators can update these verification metrics.</div>
                 </div>
              </div>
           </div>
        </section>
      )}

      <div className="customer-intel-grid">
        <div className="intel-main-column">
          <div className="card-premium">
            <div className="card-header-premium">
              <div className="card-title-premium">
                <Icon name="user" />
                <h3>Entity Attributes</h3>
              </div>
              <span className="premium-badge">Profile Core</span>
            </div>
            <div className="card-body-premium intel-grid-2">
              <div className="intel-field">
                <label>Primary Email</label>
                <div className="intel-value">{customer.email || 'N/A'}</div>
              </div>
              <div className="intel-field">
                <label>Mobile Hub</label>
                <div className="intel-value">{customer.phone || 'N/A'}</div>
              </div>
              <div className="intel-field">
                <label>Alt Phone</label>
                <div className="intel-value">{customer.alternate_phone || 'None recorded'}</div>
              </div>
              <div className="intel-field">
                <label>Postal Code</label>
                <div className="intel-value">{customer.postal_code || 'N/A'}</div>
              </div>
              <div className="intel-field full-width">
                <label>Physical Address</label>
                <div className="intel-value">{customer.address || 'No physical address tracked.'}</div>
              </div>
            </div>
          </div>

          <InteractionLogger 
            relatedId={id} 
            relatedType="Customer" 
            onNoteAdded={() => setTimelineKey(prev => prev + 1)} 
          />

          <div className="grid2">
            <div className="card-premium">
              <div className="card-header-premium">
                <div className="card-title-premium">
                  <Icon name="deals" />
                  <h3>Deal Lifecycle</h3>
                </div>
              </div>
              <div className="card-body-premium">
                {deals.length > 0 ? (
                  <div className="high-density-table-wrap">
                    <table className="table-minimal-premium">
                      <thead>
                        <tr>
                          <th>Target Deal</th>
                          <th>Valuation</th>
                          <th>Stage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deals.map(deal => (
                          <tr key={deal.id}>
                            <td><Link className="link-standard" to={`/deals/${deal.id}`}>{deal.name}</Link></td>
                            <td className="font-numeric">INR {deal.value?.toLocaleString()}</td>
                            <td><span className="stage-chip-mini">{deal.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="muted p20 center">No active deals found.</div>
                )}
              </div>
            </div>

          </div>
        </div>

        <aside className="intel-side-column">
          {customer.converted_from_lead_id && (
            <section className="card-premium origin-card">
              <div className="card-header-premium">
                <div className="card-title-premium">
                  <Icon name="dashboard" />
                  <h3>Lead Origin</h3>
                </div>
                <span className="premium-badge success">Converted</span>
              </div>
              <div className="card-body-premium">
                <div className="origin-data-stack">
                   <div className="origin-item">
                     <span className="origin-label">Initial Source</span>
                     <span className="origin-value">{customer.source || 'Direct Outreach'}</span>
                   </div>
                   <div className="origin-item">
                     <span className="origin-label">Captured As</span>
                     <span className="origin-value">{customer.converted_from_lead_id.name}</span>
                   </div>
                </div>
                <Link to={`/leads/${customer.converted_from_lead_id?.id || customer.converted_from_lead_id}`} className="action-link-premium">
                  <Icon name="eye" />
                  <span>Inspect Original Lead</span>
                </Link>
              </div>
            </section>
          )}

          <section className="card-premium stack gap-16">
            <div className="card-header-premium">
              <div className="card-title-premium">
                <Icon name="notes" />
                <h3>Strategic Notes</h3>
              </div>
            </div>
            <div className="card-body-premium">
              <div className="context-note-bubble">
                {customer.notes || 'No strategic notes available for this entity.'}
              </div>
            </div>
          </section>
        </aside>
      </div>

      <div className="detail-bottom-section">
         <div className="detail-bottom-grid">
           <section className="card-premium">
             <div className="card-header-premium">
               <div className="card-title-premium">
                 <Icon name="reports" />
                 <h3>Customer History</h3>
               </div>
             </div>
             <div className="card-body-premium">
               <Timeline key={timelineKey} relatedId={id} relatedType="Customer" />
             </div>
           </section>

           {customer?.converted_from_lead_id?.id ? (
             <section className="card-premium">
               <div className="card-header-premium">
                 <div className="card-title-premium">
                   <Icon name="leads" />
                   <h3>Lead History (Before Conversion)</h3>
                 </div>
                 <Link className="btn-premium action-secondary" to={`/leads/${customer.converted_from_lead_id.id}`}>
                   <Icon name="eye" />
                   <span>Open Lead</span>
                 </Link>
               </div>
               <div className="card-body-premium">
                 <Timeline relatedId={customer.converted_from_lead_id.id} relatedType="Lead" />
               </div>
             </section>
           ) : null}
         </div>
      </div>

      <style>{`
        .customer-profile-container { padding-bottom: 60px; }
        .detail-bottom-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
        .control-bar-premium { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
        .btn-premium { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 12px; font-weight: 700; font-size: 0.88rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid transparent; cursor: pointer; }
        .action-vibrant { background: var(--primary); color: white; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
        .action-success { background: rgba(16, 185, 129, 0.1); color: #10b981; border-color: rgba(16, 185, 129, 0.2); }
        .action-info { background: rgba(14, 165, 233, 0.1); color: #0ea5e9; border-color: rgba(14, 165, 233, 0.2); }
        .action-secondary { background: var(--bg-surface); color: var(--text-muted); border-color: var(--border); }
        .action-danger { background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: rgba(239, 68, 68, 0.2); }
        .btn-premium:hover { transform: translateY(-2px); filter: brightness(1.05); }

        .customer-hero-shell { position: relative; overflow: hidden; background: radial-gradient(circle at top left, rgba(99, 102, 241, 0.15), transparent 40%), linear-gradient(135deg, rgba(17, 24, 39, 0.98), rgba(15, 23, 42, 0.95)); border: 1px solid var(--border); border-radius: 32px; padding: 32px; box-shadow: var(--shadow-xl); backdrop-filter: blur(14px); }
        .hero-glow { position: absolute; border-radius: 999px; filter: blur(40px); pointer-events: none; opacity: 0.5; }
        .hero-glow-a { top: -80px; left: -40px; width: 300px; height: 300px; background: rgba(59, 130, 246, 0.2); }
        .hero-glow-b { right: -70px; bottom: -100px; width: 350px; height: 350px; background: rgba(99, 102, 241, 0.15); }
        
        .hero-topline { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; position: relative; z-index: 1; }
        .status-pill, .hero-meta-chip, .premium-badge { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.04em; padding: 7px 14px; text-transform: uppercase; }
        .badge-success-vibrant { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
        .hero-meta-chip { background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.85); border: 1px solid rgba(255, 255, 255, 0.15); }
        .premium-badge { background: rgba(255, 255, 255, 0.05); color: var(--text-dimmed); border: 1px solid rgba(255, 255, 255, 0.1); }
        .premium-badge.success { background: rgba(16, 185, 129, 0.1); color: #10b981; border-color: rgba(16, 185, 129, 0.2); }

        .hero-main-row { display: flex; align-items: center; gap: 32px; justify-content: space-between; position: relative; z-index: 1; }
        .hero-avatar-modern { width: 100px; height: 100px; flex: 0 0 auto; background: linear-gradient(135deg, #4f46e5, #9333ea); border-radius: 30px; border: 2px solid rgba(255, 255, 255, 0.1); display: flex; align-items: center; justify-content: center; font-size: 3.2rem; font-weight: 900; color: white; box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4); }
        .hero-name-modern { margin: 0 0 12px; font-size: clamp(2rem, 4vw, 3.2rem); line-height: 1; letter-spacing: -0.04em; color: white; font-weight: 900; }
        .hero-subline { display: flex; align-items: center; flex-wrap: wrap; gap: 16px; }
        .hero-subline-item { display: inline-flex; align-items: center; gap: 8px; color: rgba(255, 255, 255, 0.75); font-size: 0.95rem; font-weight: 500; }
        .hero-subline-item svg { color: var(--primary); width: 18px; }
        .hero-divider { width: 1px; height: 14px; background: rgba(255, 255, 255, 0.1); }
        
        .hero-side-stack { display: grid; gap: 12px; min-width: 280px; }
        .hero-stat-card { background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 20px; padding: 14px 18px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); }
        .hero-stat-label { display: block; color: rgba(255, 255, 255, 0.6); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; margin-bottom: 6px; }
        .hero-stat-value { color: white; font-weight: 800; font-size: 1.1rem; line-height: 1.2; }

        .customer-intel-grid { display: grid; grid-template-columns: 1fr 340px; gap: 32px; align-items: start; }
        .intel-main-column { display: grid; gap: 32px; }
        .card-premium { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 24px; overflow: hidden; box-shadow: var(--shadow-xl); }
        .card-header-premium { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.03); background: rgba(255,255,255,0.02); }
        .card-title-premium { display: flex; align-items: center; gap: 12px; }
        .card-title-premium h3 { margin: 0; font-size: 1rem; font-weight: 800; color: white; }
        .card-title-premium svg { color: var(--primary); }
        .card-body-premium { padding: 24px; }
        .intel-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .intel-field label { display: block; font-size: 0.72rem; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.08em; }
        .intel-value { font-size: 1.05rem; font-weight: 600; color: white; word-break: break-all; }
        .full-width { grid-column: 1 / -1; }
        
        .high-density-table-wrap { overflow-x: auto; }
        .table-minimal-premium { width: 100%; border-collapse: collapse; }
        .table-minimal-premium th { text-align: left; padding: 12px 0; font-size: 0.75rem; color: var(--text-dimmed); text-transform: uppercase; font-weight: 800; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .table-minimal-premium td { padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 0.9rem; color: var(--text-muted); }
        .link-standard { color: var(--primary); font-weight: 600; text-decoration: none; }
        .link-standard:hover { text-decoration: underline; }
        .font-numeric { font-variant-numeric: tabular-nums; font-weight: 700; color: white; }
        .success-text { color: #10b981; }
        .stage-chip-mini { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 800; background: rgba(255,255,255,0.05); color: var(--text-dimmed); text-transform: uppercase; }
        .stage-chip-mini.info { background: rgba(14, 165, 233, 0.1); color: #0ea5e9; }

        .origin-card { background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), var(--bg-surface)); border-color: rgba(16, 185, 129, 0.2); }
        .origin-data-stack { display: grid; gap: 16px; margin-bottom: 20px; }
        .origin-item { display: flex; flex-direction: column; gap: 4px; }
        .origin-label { font-size: 0.7rem; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; }
        .origin-value { font-weight: 700; color: white; font-size: 0.95rem; }
        .action-link-premium { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 14px; text-decoration: none; color: var(--text-muted); font-weight: 700; font-size: 0.85rem; transition: all 0.2s ease; border: 1px solid rgba(255,255,255,0.08); }
        .action-link-premium:hover { background: var(--bg-elevated); color: white; transform: translateX(5px); border-color: var(--primary); }
        .context-note-bubble { background: rgba(15, 23, 42, 0.4); padding: 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); font-size: 0.92rem; line-height: 1.6; color: var(--text-muted); font-style: italic; }

        @media (max-width: 1024px) { .customer-intel-grid { grid-template-columns: 1fr; } .intel-side-column { order: -1; } .hero-main-row { flex-direction: column; align-items: flex-start; gap: 24px; } .hero-side-stack { width: 100%; min-width: 0; grid-template-columns: 1fr 1fr; } }
        .status-pill.badge-danger-vibrant { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
        .manager-oversight-mini { background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 8px; }
        .sentiment-meter-bar { height: 12px; background: rgba(255,255,255,0.05); border-radius: 6px; overflow: hidden; margin-top: 8px; }
        .sentiment-fill { height: 100%; transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
        .bg-soft-info { background: rgba(59, 130, 246, 0.05); }
        .border-info { border: 1px solid rgba(59, 130, 246, 0.1); }
        .no-margin { margin: 0 !important; }
        .padding-8-16 { padding: 8px 16px; }
      `}</style>
    </div>
  )
}
