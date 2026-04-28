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
        <header className="leadsHeader">
          <div>
            <h1 className="leadsTitle">Expenses</h1>
            <p className="leadsDescription">Track and manage all your business expenses.</p>
          </div>
          <div className="leadsHeaderActions">
            <button className="btn-premium action-secondary" onClick={() => toast.info('Generating analysis export...')}>
              <Icon name="reports" />
              <span>Export Data</span>
            </button>
            <button className="btn-premium action-vibrant" onClick={() => navigate('/expenses/new')}>
              <Icon name="plus" />
              <span>Add Expense</span>
            </button>
          </div>
        </header>

        <div className="glass-panel leadsFiltersGrid">
          <div className="filter-cell">
            <label className="filter-label">View Mode</label>
            <div className="tabs-premium-intelligence">
              <button className={`tab-intel ${viewMode === 'list' ? 'active' : ''}`} onClick={() => { setViewMode('list'); setPage(1); }}>List</button>
              <button className={`tab-intel ${viewMode === 'report' ? 'active' : ''}`} onClick={() => setViewMode('report')}>Report</button>
            </div>
          </div>
          {viewMode === 'list' && (
            <div className="filter-cell">
              <label className="filter-label">Category</label>
              <select className="input-premium" value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}>
                <option value="">All Expenses</option>
                <option value="Rent">Rent</option>
                <option value="Salary">Salary</option>
                <option value="Software">Software</option>
                <option value="Marketing">Marketing</option>
                <option value="Travel">Travel</option>
                <option value="Other">Other</option>
              </select>
            </div>
          )}
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
        .tabs-premium-intelligence { display: flex; background: rgba(255, 255, 255, 0.03); padding: 4px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); width: fit-content; }
        .tab-intel { padding: 8px 16px; border-radius: 8px; font-size: 0.75rem; font-weight: 800; color: var(--text-dimmed); background: transparent; border: none; cursor: pointer; transition: all 0.2s ease; text-transform: uppercase; letter-spacing: 0.05em; }
        .tab-intel.active { background: var(--primary); color: white; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
      `}</style>
    </div>
  )
}
