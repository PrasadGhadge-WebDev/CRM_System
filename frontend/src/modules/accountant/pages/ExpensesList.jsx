import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../../../layouts/icons'
import { expensesApi } from '../../../services/expenses'
import { formatCurrency } from '../../../utils/formatters'
import { toast } from 'react-toastify'
import '../../../styles/leadsList.css'

export default function ExpensesList() {
  const [expenses, setExpenses] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [viewMode, setViewMode] = useState('list') 
  const limit = 20
  const navigate = useNavigate()

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true)
      if (viewMode === 'list') {
        const res = await expensesApi.list({ category, page, limit })
        setExpenses(res.items || [])
        setTotal(res.total || 0)
      } else {
        const res = await expensesApi.getReports({})
        setReports(res || [])
      }
    } catch (err) {
      toast.error('Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }, [category, page, viewMode])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return
    try {
      await expensesApi.remove(id)
      toast.success('Expense deleted')
      fetchExpenses()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed')
    }
  }

  return (
    <div className="stack leadsListPage crmContent">
      <section className="leadsFullscreenShell">
        <div className="users-page-header">
          <h1 className="users-title">Expenses Management</h1>
          <p className="users-subtitle">Track operational costs and categorize business spending</p>
        </div>

        <div className="crm-stats-bar-compact">
          <div className="stat-pill-mini">
            <span className="stat-pill-label">TOTAL SPENT</span>
            <span className="stat-pill-value inactive">₹{expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0).toLocaleString()}</span>
          </div>
          <div className="stat-pill-mini">
            <span className="stat-pill-label">TAX PAID</span>
            <span className="stat-pill-value pending">₹{expenses.reduce((sum, e) => sum + (Number(e.tax_amount) || 0), 0).toLocaleString()}</span>
          </div>
          <div className="stat-pill-mini">
            <span className="stat-pill-label">RECORDS</span>
            <span className="stat-pill-value total">{total}</span>
          </div>
          <div className="stat-pill-mini">
            <span className="stat-pill-label">CATEGORIES</span>
            <span className="stat-pill-value active">{new Set(expenses.map(e => e.category)).size}</span>
          </div>
        </div>

        <div className="unified-action-bar">
          <div className="search-filter-group">
            <div className="view-switcher-pill">
              <button className={`view-pill ${viewMode === 'list' ? 'active' : ''}`} onClick={() => { setViewMode('list'); setPage(1); }}>List</button>
              <button className={`view-pill ${viewMode === 'report' ? 'active' : ''}`} onClick={() => setViewMode('report')}>Analysis</button>
            </div>

            {viewMode === 'list' && (
              <select className="crm-input filter-select" value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}>
                <option value="">All Categories</option>
                <option value="Rent">Rent</option>
                <option value="Salary">Salary</option>
                <option value="Software">Software</option>
                <option value="Marketing">Marketing</option>
                <option value="Travel">Travel</option>
                <option value="Other">Other</option>
              </select>
            )}

            <button
              className="btn-premium-mini add-user-btn"
              onClick={() => navigate('/expenses/new')}
            >
              <Icon name="plus" size={16} />
              <span>Add Expense</span>
            </button>

            {(category) && (
              <button 
                className="btn-clear-filters"
                onClick={() => {
                  setCategory('')
                  setPage(1)
                }}
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="leadsLoadingState">
            <div className="spinner-medium" />
            <span className="muted">Loading expenses...</span>
          </div>
        ) : (
          <>
            <div className="tableWrap leadsTableWrap shadow-soft">
              <div className="leadsTableScroll">
                <table className="table-premium">
                  {viewMode === 'list' ? (
                    <>
                      <thead>
                        <tr>
                          <th style={{ width: '140px' }}>DATE</th>
                          <th style={{ width: '160px' }}>CATEGORY</th>
                          <th style={{ minWidth: '220px' }}>NOTES</th>
                          <th style={{ width: '140px' }}>TAX</th>
                          <th style={{ width: '160px' }}>TOTAL AMOUNT</th>
                          <th className="text-right" style={{ width: '100px' }}>ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.length ? (
                          expenses.map(exp => (
                            <tr key={exp._id} className="tableRowInteractive">
                              <td><span className="text-sm">{new Date(exp.date).toLocaleDateString()}</span></td>
                              <td><span className="status-pill-modern" style={{ '--pill-color': '#a855f7' }}>{exp.category}</span></td>
                              <td><span className="text-sm muted">{exp.note || 'General'}</span></td>
                              <td><span className="font-numeric text-danger">{formatCurrency(exp.tax_amount || 0)}</span></td>
                              <td><span className="font-numeric-bold text-danger">{formatCurrency(exp.amount)}</span></td>
                              <td className="text-right" onClick={e => e.stopPropagation()}>
                                <div className="tableActions">
                                  <button className="action-btn-mini" onClick={() => navigate(`/expenses/${exp._id}`)}><Icon name="edit" size={14} /></button>
                                  <button className="action-btn-mini danger" onClick={() => handleDelete(exp._id)}><Icon name="trash" size={14} /></button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6">
                              <div className="emptyState" style={{ padding: '60px 0', textAlign: 'center' }}>
                                <Icon name="reports" size={40} style={{ opacity: 0.2, marginBottom: '16px' }} />
                                <h3>No Expenses Found</h3>
                                <p className="muted" style={{ fontSize: '0.8rem' }}>Adjust filters or add a new expense.</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </>
                  ) : (
                    <>
                      <thead>
                        <tr>
                          <th style={{ minWidth: '200px' }}>CATEGORY</th>
                          <th style={{ width: '180px' }}>COUNT</th>
                          <th style={{ width: '200px' }}>TOTAL SPENT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.length ? (
                          reports.map(rep => (
                            <tr key={rep._id}>
                              <td><span className="font-bold">{rep._id}</span></td>
                              <td><span className="text-sm">{rep.count} Records</span></td>
                              <td><span className="font-numeric-bold text-danger">{formatCurrency(rep.total)}</span></td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan="3" className="text-center p-8 muted">No analysis available</td></tr>
                        )}
                      </tbody>
                    </>
                  )}
                </table>
              </div>
            </div>
            {viewMode === 'list' && total > limit && (
              <div className="pagination-container" style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <button className="btn-premium action-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                <span className="text-sm muted" style={{ display: 'flex', alignItems: 'center' }}>Page {page}</span>
                <button className="btn-premium action-secondary" disabled={page * limit >= total} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            )}
          </>
        )}
      </section>


      <style>{`
         .users-page-header { margin-bottom: 8px; }
         .users-title { font-size: 1.3rem; font-weight: 800; color: var(--text); margin-bottom: 2px; }
         .users-subtitle { font-size: 0.85rem; color: var(--text-dimmed); font-weight: 500; }

         .unified-action-bar { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 8px; flex-wrap: wrap; }
         .search-filter-group { display: flex; align-items: center; gap: 16px; flex: 1; justify-content: space-between; }
         .filter-select { max-width: 150px; }
         .btn-clear-filters { background: none; border: none; color: var(--primary); font-weight: 700; font-size: 0.8rem; cursor: pointer; }
         .btn-clear-filters:hover { text-decoration: underline; }

         .crm-stats-bar-compact { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 12px; justify-content: space-between; }
         .stat-pill-mini { background: var(--bg-card); border: 1px solid var(--border-strong); padding: 10px 16px; border-radius: 12px; display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 130px; box-shadow: var(--shadow-sm); }
         .stat-pill-label { font-size: 10px; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.05em; }
         .stat-pill-value { font-size: 20px; font-weight: 900; }
         .stat-pill-value.total { color: var(--text); }
         .stat-pill-value.active { color: var(--success); }
         .stat-pill-value.inactive { color: var(--danger); }
         .stat-pill-value.pending { color: var(--warning); }

         .crm-input { width: 100%; background: var(--bg-surface) !important; border: 1px solid var(--border-strong) !important; border-radius: 10px !important; padding: 8px 14px !important; color: var(--text) !important; font-size: 0.85rem !important; transition: all 0.2s; }
         
         .add-user-btn { background: var(--primary) !important; color: white !important; border: none !important; border-radius: 10px !important; padding: 0 20px !important; font-weight: 700 !important; height: 38px; display: flex; align-items: center; gap: 6px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.2); font-size: 0.85rem; flex-shrink: 0; }
         .add-user-btn:hover { background: var(--primary-hover) !important; transform: translateY(-2px); box-shadow: 0 6px 18px rgba(var(--primary-rgb), 0.4); }

         .view-switcher-pill { display: flex; border: 1px solid var(--border-strong); border-radius: 10px; overflow: hidden; height: 38px; background: var(--bg-surface); }
         .view-pill { border: none; padding: 0 16px; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.2s; background: transparent; color: var(--text-muted); }
         .view-pill.active { background: var(--primary); color: white; }
         .view-pill:not(.active):hover { background: var(--bg-hover); }

         .crm-table th { padding: 12px 16px !important; border-bottom: 2px solid var(--border-strong) !important; color: var(--text-dimmed) !important; font-weight: 800 !important; font-size: 0.7rem !important; }
         .crm-table td { padding: 10px 16px !important; border-bottom: 1px solid var(--border-strong) !important; }
         
         @media (max-width: 1000px) {
            .crm-stats-bar-compact { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            .stat-pill-mini { min-width: 0; padding: 10px; }
            .stat-pill-value { font-size: 1.1rem; }
            .add-user-btn { width: 100%; justify-content: center; }
         }
      `}</style>
    </div>
  )
}
