import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { customersApi } from '../../../services/customers.js'
import { dealsApi } from '../../../services/deals.js'
import { paymentsApi } from '../../../services/payments.js'
import { invoicesApi } from '../../../services/invoices.js'
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

function getCustomerDealSnapshot(customer, deals) {
  const latestDealRef = customer?.latest_deal
  const matchedDeal = latestDealRef?.id
    ? deals.find(deal => String(deal.id || deal._id) === String(latestDealRef.id))
    : null
  const fallbackDeal = matchedDeal || latestDealRef || deals[0] || null

  const totalValue = Number(fallbackDeal?.value ?? customer?.total_deal_value ?? 0) || 0
  const paidAmount = Number(fallbackDeal?.paid_amount ?? customer?.paid_amount ?? 0) || 0
  const pendingAmount = Math.max(0, Number(fallbackDeal?.value != null ? (totalValue - paidAmount) : (customer?.pending_amount ?? (totalValue - paidAmount))) || 0)
  const paymentStatus = fallbackDeal?.payment_status || customer?.payment_status || (pendingAmount === 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Pending')

  return {
    totalValue,
    paidAmount,
    pendingAmount,
    paymentStatus,
  }
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
  const isEmployee = user?.role === 'Employee'

  const [customer, setCustomer] = useState(null)
  const [deals, setDeals] = useState([])
  const [payments, setPayments] = useState([])
  const [invoices, setInvoices] = useState([])
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
      const [c, d, n, p, i] = await Promise.all([
        customersApi.get(id),
        dealsApi.list({ customer_id: id, limit: 'all' }),
        customersApi.listNotes(id),
        paymentsApi.list({ customer_id: id, limit: 'all' }),
        invoicesApi.list({ customer_id: id, limit: 'all' })
      ])
      setCustomer(c)
      setDeals(d.items || [])
      setNotes(n || [])
      setPayments(p.items || [])
      setInvoices(i.items || [])
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
  const financials = getCustomerDealSnapshot(customer, deals)

  return (
    <div className="user-profile-container" style={{ background: 'var(--bg)', minHeight: '100vh', padding: '32px' }}>
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Link to="/customers" className="back-btn-modern">
          <Icon name="chevron-left" size={18} />
          <span>Back to List</span>
        </Link>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="crm-btn-premium secondary" onClick={() => setIsFollowupOpen(true)}>
            <Icon name="phone" />
            <span>Log Call</span>
          </button>
          <button className="crm-btn-premium secondary" onClick={() => setIsFollowupOpen(true)}>
            <Icon name="calendar" />
            <span>Schedule Meeting</span>
          </button>
          <button className="crm-btn-premium success" onClick={() => setIsDealModalOpen(true)}>
            <Icon name="plus" />
            <span>Add Deal</span>
          </button>
          <button className="crm-btn-premium warning" onClick={() => navigate('/tickets/new', { state: { customerId: id } })}>
            <Icon name="alert" />
            <span>Open Ticket</span>
          </button>
          {isManagement && (
            <Link className="crm-btn-premium primary" to={`/customers/${id}/edit`}>
              <Icon name="edit" />
              <span>Edit Profile</span>
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
              <span className={`crm-status-pill-modern status-${(customer.status || 'Active').toLowerCase().replace(/\s+/g, '')}`}>
                <div className="status-dot" />
                <span>{customer.status || 'Active'}</span>
              </span>
              <span style={{ 
                background: 'var(--primary-soft)', 
                color: 'var(--primary)', 
                padding: '4px 12px', 
                borderRadius: '8px', 
                fontSize: '0.65rem', 
                fontWeight: 800, 
                textTransform: 'uppercase',
                border: '1px solid var(--primary-soft)'
              }}>
                {customer.customer_type || 'Regular'} Client
              </span>
            </div>

            <div style={{ display: 'flex', gap: '20px', color: 'var(--text-dimmed)', fontSize: '0.9rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
              <div className="contactQuickActions" style={{ marginLeft: '10px' }}>
                 <a href={`tel:${customer.phone}`} className="action-icon-mini phone" title="Call"><Icon name="phone" size={12} /></a>
                 <a href={`https://wa.me/${customer.phone?.replace(/\D/g, '')}`} target="_blank" className="action-icon-mini whatsapp" title="WhatsApp"><Icon name="whatsapp" size={12} /></a>
                 <a href={`mailto:${customer.email}`} className="action-icon-mini email" title="Email"><Icon name="mail" size={12} /></a>
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--border)', margin: '24px 0' }} />

        {/* Time Stats Row */}
        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <Icon name="clock" size={16} style={{ color: 'var(--text-dimmed)' }} />
             <span style={{ fontSize: '0.9rem', color: 'var(--text-dimmed)' }}>Total Deal Value:</span>
             <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--success)' }}>₹{financials.totalValue.toLocaleString()}</span>
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <Icon name="clock" size={16} style={{ color: 'var(--text-dimmed)' }} />
             <span style={{ fontSize: '0.9rem', color: 'var(--text-dimmed)' }}>Pending Amount:</span>
             <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--danger)' }}>₹{financials.pendingAmount.toLocaleString()}</span>
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
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Gender</label>
                <div style={{ color: 'var(--text)', fontWeight: 500 }}>{displayValue(customer.gender)}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Company</label>
                <div style={{ color: 'var(--text)', fontWeight: 500 }}>{displayValue(customer.company_name)}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Industry</label>
                <div style={{ color: 'var(--text)', fontWeight: 500 }}>{displayValue(customer.industry_type)}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Source</label>
                <div style={{ color: 'var(--text)', fontWeight: 500 }}>{displayValue(customer.source)}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>GST Number</label>
                <div style={{ color: 'var(--text)', fontWeight: 600, letterSpacing: '0.02em' }}>{displayValue(customer.gst_number)}</div>
              </div>
            </div>
            {customer.address && (
              <div style={{ marginTop: '20px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Office Address</label>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  {stripHtml(customer.address)}<br/>
                  {customer.city}{customer.state ? `, ${customer.state}` : ''} {customer.pincode}
                </div>
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
                <div className={`crm-status-pill-modern status-${(customer.status || 'Active').toLowerCase().replace(/\s+/g, '')}`} style={{ border: 'none', background: 'transparent', padding: 0 }}>
                  <div className="status-dot" />
                  <span style={{ fontWeight: 700 }}>{customer.status || 'Active'}</span>
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
          { id: 'followups', label: 'Follow-ups', icon: 'clock', roles: ['Admin', 'Manager', 'Employee'] },
          { id: 'tickets', label: 'Tickets', icon: 'alert', roles: ['Admin', 'Manager', 'Employee'] },
          { id: 'payments', label: 'Payments', icon: 'reports', roles: ['Admin', 'Manager', 'Employee', 'Accountant'] },
          { id: 'notes', label: 'Notes', icon: 'notes', roles: ['Admin', 'Manager', 'Employee'] },
          { id: 'activity', label: 'History', icon: 'reports', roles: ['Admin', 'Manager', 'Employee', 'Accountant'] }
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
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>₹{financials.totalValue.toLocaleString()}</div>
                </div>
                <div style={{ background: 'var(--primary-soft)', padding: '20px', borderRadius: '12px', border: '1px solid var(--primary-soft)' }}>
                  <div style={{ color: 'var(--primary)', fontSize: '0.8rem', marginBottom: '4px' }}>Received Amount</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>₹{financials.paidAmount.toLocaleString()}</div>
                </div>
                <div style={{ background: 'var(--danger-soft)', padding: '20px', borderRadius: '12px', border: '1px solid var(--danger-soft)' }}>
                  <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginBottom: '4px' }}>Pending Receivables</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger)' }}>₹{financials.pendingAmount.toLocaleString()}</div>
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

        {activeTab === 'invoices' && (
          <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Billing History</h3>
            </div>
            <div style={{ padding: '24px' }}>
              {invoices.length > 0 ? (
                <div className="crm-table-wrap">
                  <table className="crm-table">
                    <thead>
                      <tr>
                        <th>BILL #</th>
                        <th>DATE</th>
                        <th>DUE DATE</th>
                        <th>TOTAL</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map(inv => (
                        <tr key={inv.id}>
                          <td><Link to={`/invoices/${inv.id}`} style={{ fontWeight: 600, color: 'var(--primary)' }}>#{inv.invoice_number}</Link></td>
                          <td>{new Date(inv.invoice_date).toLocaleDateString()}</td>
                          <td>{new Date(inv.due_date).toLocaleDateString()}</td>
                          <td style={{ fontWeight: 700 }}>₹{inv.total_amount?.toLocaleString()}</td>
                          <td>
                            <span className={`crm-status-pill ${
                              inv.status === 'Paid' ? 'success' : 
                              inv.status === 'Partially Paid' ? 'warning' : 'danger'
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dimmed)' }}>No invoices generated.</div>}
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
                          <td><span style={{ fontWeight: 600, color: 'var(--success)' }}>₹{p.paid_amount?.toLocaleString()}</span></td>
                          <td>{p.payment_mode}</td>
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

        {activeTab === 'followups' && (
          <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Follow-up History</h3>
            </div>
            <div style={{ padding: '24px' }}>
               <Timeline relatedId={id} relatedType="Customer" filters={{ activity_type: ['Call', 'Meeting', 'Follow-up'] }} defaultView="table" />
            </div>
          </section>
        )}

        {activeTab === 'tickets' && (
          <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Support Tickets</h3>
            </div>
            <div style={{ padding: '24px' }}>
               {/* Simplified Ticket List or Link */}
               <div className="muted center padding40">
                  <p>Client support requests are managed in the Support module.</p>
                  <button className="crm-btn-premium mt-12" onClick={() => navigate('/tickets', { state: { q: customer.name } })}>
                     View All Client Tickets
                  </button>
               </div>
            </div>
          </section>
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
        onSave={() => {
          setIsDealModalOpen(false)
          loadCustomerData()
        }}
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

        .crm-status-pill-modern {
           padding: 4px 12px;
           border-radius: 8px;
           font-size: 0.65rem;
           font-weight: 700;
           text-transform: uppercase;
           letter-spacing: 0.05em;
           display: inline-flex;
           align-items: center;
           gap: 6px;
           background: var(--bg-surface);
           color: var(--text-muted);
           border: 1px solid var(--border-strong);
        }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-muted); }

        .status-active { color: #10b981; border-color: #bbf7d0; background: #f0fdf4; }
        .status-active .status-dot { background: #10b981; box-shadow: 0 0 6px #10b981; }

        .status-inactive { color: #64748b; border-color: #e2e8f0; background: #f8fafc; }
        .status-inactive .status-dot { background: #64748b; }

        .status-lost { color: #ef4444; border-color: #fecaca; background: #fef2f2; }
        .status-lost .status-dot { background: #ef4444; box-shadow: 0 0 6px #ef4444; }

        .status-repeat { color: #8b5cf6; border-color: #ddd6fe; background: #f5f3ff; }
        .status-repeat .status-dot { background: #8b5cf6; box-shadow: 0 0 6px #8b5cf6; }
      `}</style>
    </div>
  )
}
