import { useEffect, useState } from 'react'
import { Icon } from '../../../layouts/icons'
import { api } from '../../../services/api'
import { toast } from 'react-toastify'

export default function LeavesMgmt() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')

  useEffect(() => {
    const loadRequests = async () => {
      try {
        setLoading(true)
        const res = await api.get(`/api/hr/leaves?status=${filter}`)
        setRequests(res || [])
      } catch (err) {
        toast.error('Failed to load leave requests')
      } finally {
        setLoading(false)
      }
    }
    loadRequests()
  }, [filter])

  const handleAction = async (id, action) => {
    try {
      await api.post(`/api/hr/leaves/${id}/action`, { action })
      toast.success(`Request ${action}ed successfully`)
      setRequests(prev => prev.filter(r => r._id !== id))
    } catch (err) {
      toast.error('Operation failed')
    }
  }

  return (
    <div className="stack leadsListPage crmContent">
      <section className="leadsFullscreenShell">
        <header className="leadsHeader">
          <div>
            <h1 className="leadsTitle">Leave Management</h1>
            <p className="leadsDescription">Review, audit, and authorize institutional leave requests.</p>
          </div>
          <div className="leadsHeaderActions">
             <div className="search-filter-group" style={{ background: 'var(--bg-card)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <button 
                  className={`action-btn-mini ${filter === 'pending' ? 'active' : ''}`} 
                  onClick={() => setFilter('pending')}
                  style={{ borderRadius: '8px', padding: '8px 16px', background: filter === 'pending' ? 'var(--primary)' : 'transparent', color: filter === 'pending' ? 'white' : 'var(--text)' }}
                >
                  Pending
                </button>
                <button 
                  className={`action-btn-mini ${filter === 'approved' ? 'active' : ''}`} 
                  onClick={() => setFilter('approved')}
                  style={{ borderRadius: '8px', padding: '8px 16px', background: filter === 'approved' ? 'var(--primary)' : 'transparent', color: filter === 'approved' ? 'white' : 'var(--text)' }}
                >
                  History
                </button>
             </div>
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
                        {req.status === 'pending' ? (
                          <div className="tableActions" style={{ justifyContent: 'flex-end' }}>
                            <button className="action-btn-mini success" onClick={() => handleAction(req._id, 'approve')} title="Approve"><Icon name="check" size={14} /></button>
                            <button className="action-btn-mini danger" onClick={() => handleAction(req._id, 'reject')} title="Reject"><Icon name="close" size={14} /></button>
                          </div>
                        ) : (
                          <span className="text-xs muted italic">Processed</span>
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
