import { useEffect, useState } from 'react'
import { Icon } from '../../../layouts/icons'
import { api } from '../../../services/api'
import { toast } from 'react-toastify'
import { useAuth } from '../../../context/AuthContext'
import { FiPlus, FiClock, FiCalendar, FiFileText, FiCheck, FiX, FiInfo } from 'react-icons/fi'

export default function LeavesMgmt() {
  const { user } = useAuth()
  const isEmployee = user?.role === 'Employee' || user?.role === 'Support'
  const isAdminOrHR = user?.role === 'Admin' || user?.role === 'HR' || user?.role === 'Manager'

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Pending')
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    type: 'Casual',
    start_date: '',
    end_date: '',
    reason: ''
  })

  const loadRequests = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/api/leaves?status=${filter}`)
      setRequests(res || [])
    } catch (err) {
      toast.error('Failed to load leave requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [filter])

  const handleAction = async (id, action) => {
    try {
      await api.post(`/api/leaves/${id}/action`, { action })
      toast.success(`Request ${action}ed successfully`)
      loadRequests()
    } catch (err) {
      toast.error('Operation failed')
    }
  }

  const handleApply = async (e) => {
    e.preventDefault()
    if (!formData.start_date || !formData.end_date || !formData.reason) {
      return toast.warning('Please fill all required fields')
    }
    try {
      setSubmitting(true)
      await api.post('/api/leaves', formData)
      toast.success('Leave application submitted!')
      setShowApplyModal(false)
      setFormData({ type: 'Casual', start_date: '', end_date: '', reason: '' })
      loadRequests()
    } catch (err) {
      toast.error('Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this request?')) return
    try {
      await api.delete(`/api/leaves/${id}`)
      toast.success('Request cancelled')
      loadRequests()
    } catch (err) {
      toast.error('Cancellation failed')
    }
  }

  return (
    <div className="stack leadsListPage crmContent">
      <section className="leadsFullscreenShell">
        <header className="leadsHeader">
          <div>
            <h1 className="leadsTitle">{isEmployee && !isAdminOrHR ? 'My Leaves' : 'Leave Management'}</h1>
            <p className="leadsDescription">
              {isEmployee && !isAdminOrHR 
                ? 'Request time off and track your absence history.' 
                : 'Review, audit, and authorize institutional leave requests.'}
            </p>
          </div>
          <div className="leadsHeaderActions">
             <div className="search-filter-group" style={{ background: 'var(--bg-card)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <button 
                  className={`action-btn-mini ${filter === 'Pending' ? 'active' : ''}`} 
                  onClick={() => setFilter('Pending')}
                  style={{ borderRadius: '8px', padding: '8px 16px', background: filter === 'Pending' ? 'var(--primary)' : 'transparent', color: filter === 'Pending' ? 'white' : 'var(--text)' }}
                >
                  Pending
                </button>
                <button 
                  className={`action-btn-mini ${filter === 'Approved' ? 'active' : ''}`} 
                  onClick={() => setFilter('Approved')}
                  style={{ borderRadius: '8px', padding: '8px 16px', background: filter === 'Approved' ? 'var(--primary)' : 'transparent', color: filter === 'Approved' ? 'white' : 'var(--text)' }}
                >
                  Approved
                </button>
                <button 
                  className={`action-btn-mini ${filter === 'Rejected' ? 'active' : ''}`} 
                  onClick={() => setFilter('Rejected')}
                  style={{ borderRadius: '8px', padding: '8px 16px', background: filter === 'Rejected' ? 'var(--primary)' : 'transparent', color: filter === 'Rejected' ? 'white' : 'var(--text)' }}
                >
                  Rejected
                </button>
             </div>
             {isEmployee && (
               <button className="crm-btn-premium" onClick={() => setShowApplyModal(true)}>
                 <FiPlus /> <span>Apply Leave</span>
               </button>
             )}
          </div>
        </header>

        {loading ? (
          <div className="leadsLoadingState">
            <div className="spinner-medium" />
            <span className="muted">Syncing leave pipeline...</span>
          </div>
        ) : (
          <div className="tableWrap leadsTableWrap shadow-soft">
            <div className="leadsTableScroll">
              <table className="table-premium">
                <thead>
                  <tr>
                    <th>EMPLOYEE</th>
                    <th>TYPE</th>
                    <th>DURATION</th>
                    <th>REASON</th>
                    <th>STATUS</th>
                    <th className="text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length ? requests.map(req => (
                    <tr key={req._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="payee-avatar-mini" style={{ width: '32px', height: '32px' }}>{req.user_name?.charAt(0)}</div>
                          <div className="stack gap-0">
                            <span className="font-bold">{req.user_name}</span>
                            <span className="text-xs muted">{req.department}</span>
                          </div>
                        </div>
                      </td>
                      <td><span className="status-pill-modern" style={{ '--pill-color': '#6366f1' }}>{req.type.toUpperCase()}</span></td>
                      <td>
                        <div className="stack gap-0">
                          <span className="text-sm font-bold">{new Date(req.start_date).toLocaleDateString()}</span>
                          <span className="text-xs muted">to {new Date(req.end_date).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td style={{ maxWidth: '200px' }}><p className="text-xs muted line-clamp-1">{req.reason}</p></td>
                      <td>
                        <span className={`status-pill-modern ${req.status === 'pending' ? 'warning' : req.status === 'approved' ? 'success' : 'danger'}`}>
                          {req.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="text-right">
                        {isAdminOrHR ? (
                          req.status === 'Pending' ? (
                            <div className="tableActions" style={{ justifyContent: 'flex-end' }}>
                              <button className="action-btn-mini success" onClick={() => handleAction(req._id, 'approve')} title="Approve"><FiCheck size={14} /></button>
                              <button className="action-btn-mini danger" onClick={() => handleAction(req._id, 'reject')} title="Reject"><FiX size={14} /></button>
                            </div>
                          ) : (
                            <span className="text-xs muted italic">Processed</span>
                          )
                        ) : (
                          req.status === 'Pending' ? (
                            <button className="action-btn-mini danger" onClick={() => handleCancel(req._id)} title="Cancel Application">
                              <Icon name="trash" size={14} />
                            </button>
                          ) : (
                            <span className="text-xs muted italic">Locked</span>
                          )
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="6" className="text-center p-12 muted">No leave requests found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 📝 Apply Leave Modal */}
        {showApplyModal && (
          <div className="crm-modal-overlay">
            <div className="crm-modal-card animate-slide-up" style={{ maxWidth: '500px' }}>
              <div className="crm-modal-header">
                <div className="header-title">
                  <FiCalendar />
                  <h3>Apply for Leave</h3>
                </div>
                <button className="close-btn" onClick={() => setShowApplyModal(false)}><FiX /></button>
              </div>
              <form onSubmit={handleApply} className="crm-modal-body stack gap-20">
                <div className="sheet-field">
                  <label>Leave Type</label>
                  <select 
                    className="crm-input"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="Casual">Casual Leave</option>
                    <option value="Sick">Sick Leave</option>
                    <option value="Paid">Paid Leave</option>
                    <option value="Emergency">Emergency Leave</option>
                  </select>
                </div>
                <div className="grid-2 gap-16">
                  <div className="sheet-field">
                    <label>Start Date</label>
                    <input 
                      type="date" 
                      className="crm-input" 
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div className="sheet-field">
                    <label>End Date</label>
                    <input 
                      type="date" 
                      className="crm-input" 
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="sheet-field">
                  <label>Reason for Leave</label>
                  <textarea 
                    className="crm-input"
                    style={{ minHeight: '100px' }}
                    placeholder="Briefly explain your request..."
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  />
                </div>
                <div className="crm-modal-footer">
                  <button type="button" className="crm-btn-premium secondary" onClick={() => setShowApplyModal(false)}>Cancel</button>
                  <button type="submit" className="crm-btn-premium" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>

      <style>{`
        .leadsHeader { margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
        .leadsTitle { font-size: 1.8rem; font-weight: 900; background: linear-gradient(135deg, var(--text) 0%, var(--text-dimmed) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .leadsDescription { color: var(--text-dimmed); font-size: 0.9rem; font-weight: 500; }
        .line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  )
}
