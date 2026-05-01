import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { customersApi } from '../../../services/customers.js'
import { dealsApi } from '../../../services/deals.js'
import { paymentsApi } from '../../../services/payments.js'
import Timeline from '../../../components/Timeline.jsx'
import PageHeader from '../../../components/PageHeader.jsx'
import FollowupModal from '../../../components/FollowupModal.jsx'
import { Icon } from '../../../layouts/icons.jsx'
import { useToastFeedback } from '../../../utils/useToastFeedback.js'
import { useAuth } from '../../../context/AuthContext.jsx'
import DealModal from '../components/DealModal.jsx'

function displayValue(value, fallback = '—') {
  return value || fallback
}

function stripHtml(html) {
  if (!html) return ''
  const tmp = document.createElement('DIV')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

export default function CustomerDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin'
  const isManager = user?.role === 'Manager'
  const isAccountant = user?.role === 'Accountant'
  const isHR = user?.role === 'HR'

  const isManagement = isAdmin || isManager
  const isReadOnly = isHR || isAccountant

  const [customer, setCustomer] = useState(null)
  const [deals, setDeals] = useState([])
  const [payments, setPayments] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('summary')
  const [newNote, setNewNote] = useState('')
  const [postingNote, setPostingNote] = useState(false)
  const [isFollowupOpen, setIsFollowupOpen] = useState(false)
  const [isDealModalOpen, setIsDealModalOpen] = useState(false)

  useToastFeedback({ error })

  const loadCustomerData = useCallback(async () => {
    try {
      const [c, d, n, p] = await Promise.all([
        customersApi.get(id),
        dealsApi.list({ customer_id: id, limit: 'all' }),
        customersApi.listNotes(id),
        paymentsApi.list({ customer_id: id, limit: 'all' })
      ])
      setCustomer(c)
      setDeals(d.items || [])
      setNotes(n || [])
      setPayments(p.items || [])
    } catch (e) {
      setError(e.message || 'Failed to load intelligence')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadCustomerData()
  }, [loadCustomerData])

  async function handleAddNote(e) {
    e.preventDefault()
    if (!newNote.trim()) return
    setPostingNote(true)
    try {
      const saved = await customersApi.addNote(id, { content: newNote })
      setNotes(prev => [saved, ...prev])
      setNewNote('')
      toast.success('Strategy note logged')
    } catch {
      toast.error('Failed to log update')
    } finally {
      setPostingNote(false)
    }
  }

  if (loading) return (
    <div className="center padding40 stack gap-20">
      <div className="spinner-medium" />
      <span className="muted">Synchronizing client record...</span>
    </div>
  )
  if (error && !customer) return <div className="alert error glass-alert">{error}</div>
  if (!customer) return <div className="muted center padding40">Record not found.</div>

  const canModify = !isReadOnly && (isManagement || String(customer.assigned_to?.id || customer.assigned_to) === String(user?.id))

  const paymentStatusClass = customer.payment_status === 'Paid' ? 'badge-success-vibrant' :
    customer.payment_status === 'Partial' ? 'badge-warning-vibrant' :
      'badge-danger-vibrant'

  return (
    <div className="user-profile-container" style={{ background: 'var(--bg)', minHeight: '100vh', padding: '32px' }}>
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Link to="/customers" className="back-btn-modern">
          <Icon name="chevron-left" size={18} />
          <span>Back to List</span>
        </Link>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="crm-btn-premium" onClick={() => setIsFollowupOpen(true)} style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', padding: '8px 16px', fontSize: '0.85rem', boxShadow: 'var(--shadow-sm)', borderRadius: '8px' }}>
            <Icon name="phone" />
            <span>Log Follow-up</span>
          </button>
          {!isReadOnly && (
            <button className="crm-btn-premium" onClick={() => setIsDealModalOpen(true)} style={{ background: 'var(--success)', color: '#ffffff', border: 'none', padding: '8px 16px', fontSize: '0.85rem', boxShadow: 'var(--shadow-sm)', borderRadius: '8px' }}>
              <Icon name="plus" />
              <span>New Deal</span>
            </button>
          )}
          {canModify && (
            <Link className="crm-btn-premium" to={`/customers/${id}/edit`} style={{ background: 'var(--primary)', color: '#ffffff', padding: '8px 24px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
              <Icon name="edit" />
              <span>Edit Customer</span>
            </Link>
          )}
        </div>
      </div>

      {/* Profile Header Card */}
      <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '32px', marginBottom: '24px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700, flexShrink: 0, boxShadow: 'inset 0 0 0 1px var(--primary-soft)' }}>
             {(customer.name || 'C').split(' ').map(n => n[0]).join('').toUpperCase()}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>{customer.name}</h1>
              <span style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', padding: '2px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid var(--border)' }}>
                {customer.status || 'Active'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600, marginLeft: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} />
                <span>Active</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', color: 'var(--text-dimmed)', fontSize: '0.9rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="mail" size={14} />
                <span>{customer.email || 'No email'}</span>
              </div>
              {customer.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name="phone" size={14} />
                  <span>{customer.phone}</span>
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
             <span style={{ fontSize: '0.9rem', color: 'var(--text-dimmed)' }}>Total Deal Value:</span>
             <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--success)' }}>₹{(customer.total_deal_value || 0).toLocaleString()}</span>
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <Icon name="clock" size={16} style={{ color: 'var(--text-dimmed)' }} />
             <span style={{ fontSize: '0.9rem', color: 'var(--text-dimmed)' }}>Pending Amount:</span>
             <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--danger)' }}>₹{(customer.pending_amount || 0).toLocaleString()}</span>
           </div>
        </div>
      </section>

      {/* Main Grid */}
      <div className="crm-profile-grid-desktop" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        {/* Customer Details Card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Customer Details</h3>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Full Name</label>
                <div style={{ color: 'var(--text)', fontWeight: 500 }}>{displayValue(customer.name)}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Company</label>
                <div style={{ color: 'var(--text)', fontWeight: 500 }}>{displayValue(customer.company_name)}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Source</label>
                <div style={{ color: 'var(--text)', fontWeight: 500 }}>{displayValue(customer.source)}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Payment Status</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: customer.payment_status === 'Paid' ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: customer.payment_status === 'Paid' ? 'var(--success)' : 'var(--danger)' }} />
                  {customer.payment_status || 'Pending'}
                </div>
              </div>
            </div>
            {customer.address && (
              <div style={{ marginTop: '20px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Office Address</label>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>{stripHtml(customer.address)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Account Snapshot Table Card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Customer Snapshot</h3>
          </div>
          <div style={{ padding: '0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border)' }}>
              <div style={{ padding: '20px 24px', borderRight: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dimmed)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🧑💼</span> Assigned To
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>{customer.assigned_to?.name || 'Unassigned'}</div>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dimmed)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🔌</span> Connectivity
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontWeight: 700 }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }} />
                  Active
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ padding: '20px 24px', borderRight: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dimmed)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📅</span> Last Interaction
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                  {customer.last_interaction_date ? new Date(customer.last_interaction_date).toLocaleDateString() : 'Never'}
                </div>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dimmed)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⏱️</span> Next Follow-up
                </div>
                <div style={{ fontWeight: 600, color: customer.next_followup_date ? 'var(--primary)' : 'var(--text)', fontSize: '0.85rem' }}>
                   {customer.next_followup_date ? new Date(customer.next_followup_date).toLocaleDateString() : 'Not Set'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="crm-hub-nav" style={{ marginTop: '24px' }}>
        {[
          { id: 'summary', label: 'Summary', icon: 'dashboard', roles: ['Admin', 'Manager', 'Employee', 'Accountant', 'HR'] },
          { id: 'deals', label: 'Deals', icon: 'deals', roles: ['Admin', 'Manager', 'Employee', 'Accountant'] },
          { id: 'payments', label: 'Payments', icon: 'reports', roles: ['Admin', 'Manager', 'Accountant'] },
          { id: 'notes', label: 'Notes', icon: 'notes', roles: ['Admin', 'Manager', 'Employee'] },
          { id: 'activity', label: 'Activity History', icon: 'reports', roles: ['Admin', 'Manager', 'Employee', 'Accountant'] }
        ].filter(tab => !tab.roles || tab.roles.includes(user?.role)).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`crm-hub-tab ${activeTab === tab.id ? 'active' : ''}`}
            style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}
          >
            <Icon name={tab.icon} size={14} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div style={{ marginTop: '24px' }}>
        {activeTab === 'summary' && (
          <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Financial Performance</h3>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ color: 'var(--text-dimmed)', fontSize: '0.8rem', marginBottom: '4px' }}>Total Business</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>₹{(customer.total_deal_value || 0).toLocaleString()}</div>
                </div>
                <div style={{ background: 'var(--primary-soft)', padding: '20px', borderRadius: '12px', border: '1px solid var(--primary-soft)' }}>
                  <div style={{ color: 'var(--primary)', fontSize: '0.8rem', marginBottom: '4px' }}>Received Amount</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>₹{(customer.paid_amount || 0).toLocaleString()}</div>
                </div>
                <div style={{ background: 'var(--danger-soft)', padding: '20px', borderRadius: '12px', border: '1px solid var(--danger-soft)' }}>
                  <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginBottom: '4px' }}>Pending Receivables</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger)' }}>₹{(customer.pending_amount || 0).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'deals' && (
          <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Deals Overview</h3>
            </div>
            <div style={{ padding: '24px' }}>
              {deals.length > 0 ? (
                <div className="crm-table-wrap">
                  <table className="crm-table">
                    <thead>
                      <tr>
                        <th>DEAL ID</th>
                        <th>NAME</th>
                        <th>VALUE</th>
                        <th>STAGE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deals.map(deal => (
                        <tr key={deal.id}>
                          <td><span style={{ fontSize: '0.8rem', color: 'var(--text-dimmed)' }}>{deal.readable_id || 'N/A'}</span></td>
                          <td><Link to={`/deals/${deal.id}`} style={{ fontWeight: 600, color: 'var(--primary)' }}>{deal.name}</Link></td>
                          <td>₹{deal.value?.toLocaleString()}</td>
                          <td><span style={{ background: 'var(--bg-surface)', color: 'var(--text)', padding: '2px 8px', borderRadius: '100px', fontSize: '0.7rem', border: '1px solid var(--border)' }}>{deal.stage}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dimmed)' }}>No deals registered.</div>}
            </div>
          </section>
        )}

        {activeTab === 'payments' && (
          <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Payment Records</h3>
            </div>
            <div style={{ padding: '24px' }}>
              {payments.length > 0 ? (
                <div className="crm-table-wrap">
                  <table className="crm-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>AMOUNT</th>
                        <th>METHOD</th>
                        <th>DATE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map(p => (
                        <tr key={p.id}>
                          <td><span style={{ fontSize: '0.8rem', color: 'var(--text-dimmed)' }}>{p.payment_number}</span></td>
                          <td><span style={{ fontWeight: 600, color: 'var(--success)' }}>₹{p.amount?.toLocaleString()}</span></td>
                          <td>{p.payment_method}</td>
                          <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dimmed)' }}>No payments recorded.</div>}
            </div>
          </section>
        )}

        {activeTab === 'notes' && (
          <div style={{ display: 'grid', gap: '24px' }}>
            <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
               <form onSubmit={handleAddNote}>
                  <textarea 
                    style={{ width: '100%', minHeight: '100px', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text)', resize: 'vertical' }}
                    placeholder="Log a strategy update or internal note..."
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <button className="crm-btn-premium" style={{ background: 'var(--primary)', color: '#ffffff' }} disabled={postingNote || !newNote.trim()}>
                      {postingNote ? 'Saving...' : 'Post Note'}
                    </button>
                  </div>
               </form>
            </section>
            <div style={{ display: 'grid', gap: '16px' }}>
              {notes.map(note => (
                <div key={note.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text)' }}>{note.author_id?.name || 'Staff'}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-dimmed)' }}>{new Date(note.created_at).toLocaleString()}</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>{stripHtml(note.content)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Engagement Timeline</h3>
            </div>
            <div style={{ padding: '24px' }}>
              <Timeline relatedId={id} relatedType="Customer" defaultView="table" />
            </div>
          </section>
        )}
      </div>

      <DealModal
        isOpen={isDealModalOpen}
        customerId={id}
        onClose={() => setIsDealModalOpen(false)}
        onSave={() => loadCustomerData()}
      />

      <FollowupModal
        isOpen={isFollowupOpen}
        lead={{ ...customer, relatedType: 'Customer' }}
        onClose={() => setIsFollowupOpen(false)}
        onSave={(updated) => {
          setCustomer(prev => ({ ...prev, ...updated }));
          setIsFollowupOpen(false);
          loadCustomerData();
        }}
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
