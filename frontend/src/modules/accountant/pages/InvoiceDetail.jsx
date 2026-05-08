import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { invoicesApi } from '../../../services/invoices'
import { paymentsApi } from '../../../services/payments'
import { formatCurrency, numberToWords } from '../../../utils/formatters'
import { Icon } from '../../../layouts/icons'
import PageHeader from '../../../components/PageHeader.jsx'
import { toast } from 'react-toastify'
import html2pdf from 'html2pdf.js/dist/html2pdf.bundle.min.js'

import { useAuth } from '../../../context/AuthContext'

export default function InvoiceDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState(null)
  const [payments, setPayments] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const canEdit = ['Admin', 'Accountant'].includes(user?.role)
  const isAdmin = user?.role === 'Admin'
  const isManager = user?.role === 'Manager'

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [invData, payData, usersData] = await Promise.all([
          invoicesApi.get(id),
          paymentsApi.list({ invoice_id: id, limit: 100 }),
          api.get('/api/users?limit=200')
        ])
        setInvoice(invData)
        setPayments(payData.items || [])
        setUsers((usersData.items || []).filter(u => u.role !== 'HR'))
      } catch (err) {
        toast.error('Failed to load bill details')
        navigate('/invoices')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id, navigate])

  if (loading) return <div className="p-24 muted">Loading bill details...</div>
  if (!invoice) return <div className="p-24 muted">Bill not found</div>

  const remaining = invoice.total_amount - (invoice.paid_amount || 0)

  const handleShareWhatsApp = async () => {
    window.open(`https://wa.me/${invoice.customer_info?.phone || invoice.customer_id?.phone}?text=Hello, your bill #${invoice.invoice_number} for ${formatCurrency(invoice.total_amount)} is ready.`)
    try {
      await invoicesApi.logAction(id, 'Shared via WhatsApp')
    } catch (err) {
      console.error('Failed to log share action', err)
    }
  }

  const handlePrint = async () => {
    const element = document.getElementById('printable-invoice')
    if (!element) {
      window.print()
      return
    }

    const opt = {
      margin: 0,
      filename: `Invoice_${invoice.invoice_number}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    toast.info('Generating PDF...')
    try {
      await html2pdf().set(opt).from(element).save()
      toast.success('PDF Downloaded!')
      await invoicesApi.logAction(id, 'Downloaded as PDF')
    } catch (err) {
      console.error('Failed to generate PDF', err)
      toast.error('PDF Generation failed, opening print dialog...')
      window.print()
    }
  }

  const handlePayOnline = () => {
    toast.info('Razorpay Integration Coming Soon! This will open the secure payment gateway.')
  }

  return (
    <div className="user-profile-container" style={{ background: 'var(--bg)', minHeight: '100vh', padding: '32px' }}>
      {/* Header Row */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <button onClick={() => navigate('/invoices')} className="back-btn-modern">
          <Icon name="chevronLeft" />
          <span>Back to Invoices</span>
        </button>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
           {canEdit && remaining > 0 && (
             <button className="crm-btn-premium" onClick={() => navigate(`/payments/new?invoiceId=${invoice.id}&customerId=${invoice.customer_id?._id || invoice.customer_id}`)} style={{ background: 'var(--success)', color: '#ffffff', border: 'none', padding: '8px 16px', fontSize: '0.85rem', boxShadow: 'var(--shadow-sm)', borderRadius: '8px' }}>
               <Icon name="plus" />
               <span>Add Payment</span>
             </button>
           )}
           <button className="crm-btn-premium" onClick={handleShareWhatsApp} style={{ background: '#25d366', color: '#ffffff', border: 'none', padding: '8px 16px', fontSize: '0.85rem', boxShadow: 'var(--shadow-sm)', borderRadius: '8px' }}>
             <Icon name="phone" />
             <span>WhatsApp</span>
           </button>
           <button className="crm-btn-premium" onClick={handlePrint} style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', padding: '8px 16px', fontSize: '0.85rem', boxShadow: 'var(--shadow-sm)', borderRadius: '8px' }}>
             <Icon name="reports" />
             <span>Print Bill</span>
           </button>
           {canEdit && (
             <button className="crm-btn-premium" onClick={() => navigate(`/invoices/${invoice.id}/edit`)} style={{ background: 'var(--primary)', color: '#ffffff', border: 'none', padding: '8px 24px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
               <Icon name="edit" />
               <span>Edit Bill</span>
             </button>
           )}
        </div>
      </div>

      {/* Profile Header Card */}
      <section className="no-print" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '32px', marginBottom: '24px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700, flexShrink: 0, boxShadow: 'inset 0 0 0 1px var(--primary-soft)' }}>
             <Icon name="billing" size={32} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>{formatCurrency(invoice.total_amount)}</h1>
              <span style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', padding: '2px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid var(--border)' }}>
                {invoice.status}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: invoice.status === 'Paid' ? 'var(--success)' : 'var(--danger)', fontWeight: 600, marginLeft: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: invoice.status === 'Paid' ? 'var(--success)' : 'var(--danger)' }} />
                <span>{invoice.status === 'Paid' ? 'Settled' : 'Pending'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', color: 'var(--text-dimmed)', fontSize: '0.9rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="user" size={14} />
                <span>{invoice.customer_info?.name || invoice.customer_id?.name || 'Client'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="alert" size={14} />
                <span>Due: {new Date(invoice.due_date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--border)', margin: '24px 0' }} />

        {/* Time Stats Row */}
        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <Icon name="clock" size={16} style={{ color: 'var(--text-dimmed)' }} />
             <span style={{ fontSize: '0.9rem', color: 'var(--text-dimmed)' }}>Total Amount:</span>
             <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>{formatCurrency(invoice.total_amount)}</span>
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <Icon name="clock" size={16} style={{ color: 'var(--text-dimmed)' }} />
             <span style={{ fontSize: '0.9rem', color: 'var(--text-dimmed)' }}>Remaining:</span>
             <span style={{ fontSize: '0.9rem', fontWeight: 600, color: remaining > 0 ? 'var(--danger)' : 'var(--success)' }}>{formatCurrency(remaining)}</span>
           </div>
        </div>
      </section>

      {/* Main Grid */}
      <div className="crm-profile-grid-desktop no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        
        {/* Bill Details Card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Bill Overview</h3>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Bill Number</label>
                <div style={{ color: 'var(--text)', fontWeight: 500 }}>#{invoice.invoice_number}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Total Billed</label>
                <div style={{ color: 'var(--text)', fontWeight: 700 }}>{formatCurrency(invoice.total_amount)}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Received</label>
                <div style={{ color: 'var(--success)', fontWeight: 700 }}>{formatCurrency(invoice.paid_amount || 0)}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Balance</label>
                <div style={{ color: remaining > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>{formatCurrency(remaining)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Snapshot Table Card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Follow-up & Assignment</h3>
            {(isAdmin || isManager) && (
              <span className="text-xs muted font-bold" style={{ background: 'var(--primary-soft)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px' }}>
                MANAGER CONTROL
              </span>
            )}
          </div>
          <div style={{ padding: '20px 24px' }}>
            <div className="stack gap-4">
              <div className="sheet-field">
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 800, display: 'block', marginBottom: '8px' }}>Assign To (Collection Agent)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select 
                    className="crm-input" 
                    value={invoice.assigned_to?._id || invoice.assigned_to || ''} 
                    onChange={async (e) => {
                      const val = e.target.value;
                      try {
                        await invoicesApi.update(id, { assigned_to: val });
                        setInvoice({ ...invoice, assigned_to: val });
                        toast.success('Assignment updated');
                      } catch (err) { toast.error('Failed to update assignment'); }
                    }}
                    disabled={!isAdmin && !isManager}
                  >
                    <option value="">Unassigned</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="sheet-field">
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', textTransform: 'uppercase', fontWeight: 800, display: 'block', marginBottom: '8px' }}>Next Follow-up Date</label>
                <input 
                  type="date" 
                  className="crm-input" 
                  value={invoice.next_follow_up ? new Date(invoice.next_follow_up).toISOString().split('T')[0] : ''} 
                  onChange={async (e) => {
                    const val = e.target.value;
                    try {
                      await invoicesApi.update(id, { next_follow_up: val });
                      setInvoice({ ...invoice, next_follow_up: val });
                      toast.success('Follow-up date set');
                    } catch (err) { toast.error('Failed to update follow-up'); }
                  }}
                  disabled={!isAdmin && !isManager}
                />
                {invoice.next_follow_up && new Date(invoice.next_follow_up) < new Date() && (
                  <div className="text-xs font-bold" style={{ color: 'var(--danger)', marginTop: '4px' }}>⚠️ Follow-up Overdue</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Invoice Wrapper */}
      <div className="crm-detail-grid">
        <div className="crm-detail-main">
          <div className="invoice-container crm-detail-card no-padding overflow-hidden shadow-soft" id="printable-invoice" style={{ background: 'white', color: '#1a202c', border: 'none', borderRadius: '4px', fontFamily: "'Inter', sans-serif" }}>
            <div style={{ padding: '40px' }}>
              {/* Company Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #1a202c', paddingBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ width: '180px', height: '60px', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
                    <img 
                      src={invoice.company_info?.logo || '/CRM_Logo.png'} 
                      alt="Logo" 
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>
                      {invoice.company_info?.name || 'DIVINE TECHNOLOGIES'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#4a5568', marginTop: '2px' }}>
                      {invoice.company_info?.address || 'Office No. 101, Pune, India - 411001'}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#2d3748', marginTop: '2px' }}>
                      GST: {invoice.gst_number || '27AAAAA1234A1Z'} &nbsp;|&nbsp; Tel: {invoice.company_info?.phone || '020-1234567'}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <div style={{ fontSize: '18px', fontWeight: 900, textDecoration: 'underline', letterSpacing: '2px' }}>TAX INVOICE</div>
                   <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>Original Copy</div>
                </div>
              </div>

              {/* Meta Data */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div><strong>Invoice No:</strong> {invoice.invoice_number}</div>
                  <div><strong>Order No:</strong> {invoice.order_number || invoice.deal_id?.name || 'ORD-2025-001'}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                  <div><strong>Date:</strong> {new Date(invoice.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  <div><strong>Due Date:</strong> {new Date(invoice.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '40px', marginBottom: '32px' }}>
                {/* Billed To */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#718096', textTransform: 'uppercase', marginBottom: '8px' }}>Billed To:</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#1a202c' }}>{invoice.customer_info?.name || invoice.customer_id?.name}</div>
                  <div style={{ fontSize: '13px', color: '#4a5568', marginTop: '4px', whiteSpace: 'pre-wrap' }}>{invoice.customer_info?.address || invoice.customer_id?.address || 'N/A'}</div>
                  {invoice.customer_info?.phone && <div style={{ fontSize: '13px', color: '#4a5568', marginTop: '2px' }}>Ph: {invoice.customer_info.phone}</div>}
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#2d3748', marginTop: '8px' }}>GST: {invoice.customer_info?.gst_number || invoice.customer_id?.gst_number || 'URP (Unregistered)'}</div>
                </div>
                
                {/* Supply Details */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#718096', textTransform: 'uppercase', marginBottom: '8px' }}>Place of Supply:</div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{invoice.customer_info?.state || invoice.customer_id?.state || 'Maharashtra'} (State Code: 27)</div>
                  <div style={{ marginTop: '12px' }}>
                     <div style={{ fontSize: '11px', fontWeight: 800, color: '#718096', textTransform: 'uppercase', marginBottom: '4px' }}>Payment Status:</div>
                     <span style={{ 
                        background: invoice.status === 'Paid' ? '#f0fff4' : '#fff5f5', 
                        color: invoice.status === 'Paid' ? '#22543d' : '#822727', 
                        padding: '4px 12px', 
                        borderRadius: '4px', 
                        fontSize: '12px', 
                        fontWeight: 800,
                        border: `1px solid ${invoice.status === 'Paid' ? '#c6f6d5' : '#fed7d7'}`
                     }}>
                        {invoice.status?.toUpperCase()}
                     </span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #1a202c' }}>
                <thead>
                  <tr style={{ background: '#f7fafc', borderBottom: '2px solid #1a202c' }}>
                    <th style={{ padding: '10px', fontSize: '11px', border: '1px solid #1a202c', textAlign: 'center' }}>Sl. No.</th>
                    <th style={{ padding: '10px', fontSize: '11px', border: '1px solid #1a202c', textAlign: 'left' }}>Product / Description</th>
                    <th style={{ padding: '10px', fontSize: '11px', border: '1px solid #1a202c', textAlign: 'center' }}>HSN</th>
                    <th style={{ padding: '10px', fontSize: '11px', border: '1px solid #1a202c', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '10px', fontSize: '11px', border: '1px solid #1a202c', textAlign: 'right' }}>Unit Price (₹)</th>
                    <th style={{ padding: '10px', fontSize: '11px', border: '1px solid #1a202c', textAlign: 'center' }}>Disc (%)</th>
                    <th style={{ padding: '10px', fontSize: '11px', border: '1px solid #1a202c', textAlign: 'right' }}>Taxable Value</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '10px', fontSize: '12px', border: '1px solid #1a202c', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ padding: '10px', fontSize: '12px', border: '1px solid #1a202c' }}>
                        <div style={{ fontWeight: 600 }}>{item.description}</div>
                      </td>
                      <td style={{ padding: '10px', fontSize: '12px', border: '1px solid #1a202c', textAlign: 'center' }}>{item.hsn || '9983'}</td>
                      <td style={{ padding: '10px', fontSize: '12px', border: '1px solid #1a202c', textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ padding: '10px', fontSize: '12px', border: '1px solid #1a202c', textAlign: 'right' }}>{formatCurrency(item.price).replace('₹', '')}</td>
                      <td style={{ padding: '10px', fontSize: '12px', border: '1px solid #1a202c', textAlign: 'center' }}>{item.discount || 0}%</td>
                      <td style={{ padding: '10px', fontSize: '12px', border: '1px solid #1a202c', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.amount).replace('₹', '')}</td>
                    </tr>
                  ))}
                  {/* Fill empty rows for height if needed */}
                  {invoice.items.length < 5 && Array.from({ length: 5 - invoice.items.length }).map((_, i) => (
                    <tr key={`empty-${i}`}>
                      <td style={{ padding: '15px', border: '1px solid #1a202c' }}></td>
                      <td style={{ border: '1px solid #1a202c' }}></td>
                      <td style={{ border: '1px solid #1a202c' }}></td>
                      <td style={{ border: '1px solid #1a202c' }}></td>
                      <td style={{ border: '1px solid #1a202c' }}></td>
                      <td style={{ border: '1px solid #1a202c' }}></td>
                      <td style={{ border: '1px solid #1a202c' }}></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Calculations */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', marginTop: '1px' }}>
                <div style={{ border: '1px solid #1a202c', padding: '15px' }}>
                   <div style={{ fontSize: '11px', fontWeight: 800, color: '#718096', textTransform: 'uppercase', marginBottom: '8px' }}>Total in Words:</div>
                   <div style={{ fontSize: '13px', fontWeight: 700, fontStyle: 'italic' }}>
                      {numberToWords(invoice.total_amount)}
                   </div>
                   
                   <div style={{ marginTop: '24px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#718096', textTransform: 'uppercase', marginBottom: '8px' }}>Bank Details:</div>
                      {invoice.company_info?.bank_name ? (
                        <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div><strong>Bank:</strong> {invoice.company_info.bank_name}</div>
                          <div><strong>A/c No:</strong> {invoice.company_info.account_number}</div>
                          <div><strong>IFSC:</strong> {invoice.company_info.ifsc_code}</div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#718096' }}>
                          Please contact accounts for banking details.
                        </div>
                      )}
                   </div>

                   {invoice.company_info?.upi_id && (
                     <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: '#718096', textTransform: 'uppercase' }}>UPI ID:</div>
                          <div style={{ fontSize: '12px', fontWeight: 700 }}>{invoice.company_info.upi_id}</div>
                        </div>
                     </div>
                   )}
                </div>

                <div style={{ border: '1px solid #1a202c', borderLeft: 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #edf2f7' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Subtotal:</span>
                    <span style={{ fontSize: '12px', fontWeight: 700 }}>{formatCurrency(invoice.subtotal).replace('₹', '')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #edf2f7', color: '#e53e3e' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Discount:</span>
                    <span style={{ fontSize: '12px', fontWeight: 700 }}>- {formatCurrency(invoice.discount).replace('₹', '')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '2px solid #1a202c', background: '#f7fafc' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800 }}>Taxable Value:</span>
                    <span style={{ fontSize: '12px', fontWeight: 800 }}>{formatCurrency(invoice.subtotal - invoice.discount).replace('₹', '')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #edf2f7' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>CGST ({Math.min(invoice.tax_rate, 18) / 2 || 9}%):</span>
                    <span style={{ fontSize: '12px', fontWeight: 700 }}>{formatCurrency((invoice.tax_amount || 0) / 2).replace('₹', '')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #edf2f7' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>SGST ({Math.min(invoice.tax_rate, 18) / 2 || 9}%):</span>
                    <span style={{ fontSize: '12px', fontWeight: 700 }}>{formatCurrency((invoice.tax_amount || 0) / 2).replace('₹', '')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#1a202c', color: 'white' }}>
                    <span style={{ fontSize: '14px', fontWeight: 900, textTransform: 'uppercase' }}>Grand Total:</span>
                    <span style={{ fontSize: '16px', fontWeight: 900 }}>{formatCurrency(invoice.total_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ marginTop: '32px', fontSize: '11px', color: '#4a5568' }}>
                <div style={{ fontWeight: 800, color: '#1a202c', textTransform: 'uppercase', marginBottom: '4px' }}>Terms & Conditions:</div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                  {invoice.terms_and_conditions || invoice.notes || '1. Payment due within credit period. \n2. Late fee may be applicable after due date. \n3. Goods once sold will not be taken back.'}
                </div>
              </div>

              <div style={{ marginTop: '40px', borderTop: '1px dashed #cbd5e1', paddingTop: '15px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#2d3748' }}>Thank you for your business!</div>
                <div style={{ fontSize: '10px', color: '#a0aec0', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>This is a computer generated invoice. No signature required.</div>
              </div>
            </div>
          </div>
        </div>

        <aside className="crm-detail-side no-print">
          <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', marginBottom: '24px' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Payment Activity</h3>
            </div>
            <div style={{ padding: '24px' }}>
              <div className="snapshot-list">
                {payments.map(pay => (
                  <div key={pay.id} className="snapshot-row" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }} onClick={() => navigate(`/payments/${pay.id}`)}>
                    <div className="stack tiny-gap">
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>{new Date(pay.payment_date).toLocaleDateString()}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)' }}>{pay.payment_method}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(pay.amount)}</span>
                  </div>
                ))}
                {payments.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dimmed)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                    No payments documented.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--text-dimmed)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '16px' }}>Ready for Dispatch?</div>
              <button className="crm-btn-premium" style={{ width: '100%', background: 'var(--primary)', color: '#ffffff', border: 'none', justifyContent: 'center' }} onClick={handlePrint}>
                <Icon name="reports" />
                <span>Download as PDF</span>
              </button>
            </div>
          </section>
        </aside>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-invoice, #printable-invoice * { visibility: visible; }
          #printable-invoice { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; padding: 0 !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  )
}
