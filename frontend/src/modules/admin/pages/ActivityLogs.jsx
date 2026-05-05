import { useEffect, useState } from 'react'
import { activitiesApi } from '../../../services/activities'
import Pagination from '../../../components/Pagination.jsx'
import { Icon } from '../../../layouts/icons.jsx'
import { useToastFeedback } from '../../../utils/useToastFeedback'

export default function ActivityLogs() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateRangeType, setDateRangeType] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useToastFeedback({ error })

  useEffect(() => {
    let canceled = false
    setLoading(true)
    setError('')

    let sDate = startDate
    let eDate = endDate
    const now = new Date()
    now.setHours(0,0,0,0)

    if (dateRangeType === 'today') {
      sDate = now.toISOString()
      eDate = new Date(new Date().setHours(23,59,59,999)).toISOString()
    } else if (dateRangeType === 'yesterday') {
      const y = new Date(now)
      y.setDate(y.getDate() - 1)
      sDate = y.toISOString()
      const yEnd = new Date(y)
      yEnd.setHours(23,59,59,999)
      eDate = yEnd.toISOString()
    } else if (dateRangeType === 'week') {
      const w = new Date(now)
      w.setDate(w.getDate() - 7)
      sDate = w.toISOString()
    } else if (dateRangeType === 'month') {
      const m = new Date(now)
      m.setMonth(m.getMonth() - 1)
      sDate = m.toISOString()
    }

    activitiesApi
      .list({ page, limit, startDate: sDate, endDate: eDate })
      .then((res) => {
        if (canceled) return
        setItems(res.items || [])
        setTotal(res.total || 0)
      })
      .catch((e) => {
        if (canceled) return
        setError(e.message || 'Failed to load activities')
      })
      .finally(() => {
        if (canceled) return
        setLoading(false)
      })

    return () => {
      canceled = true
    }
  }, [page, limit, dateRangeType, startDate, endDate])

  return (
    <div className="stack">
      <section className="crm-fullscreen-shell">
        <div className="users-page-header">
          <h1 className="users-title">Institutional Audit</h1>
          <p className="users-subtitle">Track system-wide actions, data state changes, and personnel operations</p>
        </div>

        <div className="unified-action-bar" style={{ marginBottom: '20px' }}>
          <div className="search-filter-group" style={{ justifyContent: 'flex-start' }}>
            <select 
              className="crm-input filter-select date-preset-select" 
              value={dateRangeType} 
              onChange={(e) => { setDateRangeType(e.target.value); setPage(1); }}
            >
              <option value="all">Date: All</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>

            {dateRangeType === 'custom' && (
              <div className="flex items-center gap-4 animate-fade-in">
                <input
                  type="date"
                  className="crm-input date-mini"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                />
                <span className="muted" style={{ fontSize: '0.7rem' }}>to</span>
                <input
                  type="date"
                  className="crm-input date-mini"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                />
              </div>
            )}

            {dateRangeType !== 'all' && (
              <button 
                className="btn-premium-mini reset-btn"
                onClick={() => {
                  setDateRangeType('all')
                  setStartDate('')
                  setEndDate('')
                  setPage(1)
                }}
              >
                <Icon name="refresh" size={14} className="reset-icon" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        <div className="crm-table-wrap shadow-soft">
          <div className="crm-table-scroll">
            <table className="crm-table">
              <thead>
                <tr>
                  <th style={{ width: '180px' }}>TIMESTAMP</th>
                  <th style={{ width: '150px' }}>ENTITY/USER</th>
                  <th style={{ width: '120px' }}>PROTOCOL</th>
                  <th style={{ minWidth: '200px' }}>DESCRIPTION</th>
                  <th style={{ width: '150px' }}>DOMAIN</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="text-center" style={{ padding: '80px' }}>
                      <div className="spinner-medium" />
                      <p className="muted">Retrieving institutional audit trails...</p>
                    </td>
                  </tr>
                ) : items.length > 0 ? (
                  items.map((activity) => (
                    <tr key={activity.id || activity._id} className="crm-table-row">
                      <td>
                        <div className="stack gap-2">
                          <span className="font-numeric" style={{ color: 'var(--text)', fontWeight: 700 }}>
                            {new Date(activity.created_at || Date.now()).toLocaleDateString()}
                          </span>
                          <span className="text-xs muted">
                            {new Date(activity.created_at || Date.now()).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="crm-user-mention">
                          <div className="crm-user-dot" />
                          <div className="stack">
                            <span style={{ color: 'var(--text)', fontWeight: 600 }}>{activity.user_name || activity.user?.name || 'System'}</span>
                            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-dimmed)' }}>{activity.user_role || 'Core'}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`crm-status-pill ${activity.action?.toLowerCase() === 'delete' || activity.action?.toLowerCase() === 'purge' ? 'danger' : activity.action?.toLowerCase() === 'update' ? 'warning' : 'info'}`}>
                          {activity.action || 'LOG'}
                        </span>
                      </td>
                      <td>
                        <div style={{ whiteSpace: 'normal', maxWidth: '500px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                          {activity.description || activity.message || '—'}
                        </div>
                      </td>
                      <td>
                        <span className="crm-status-pill" style={{ opacity: 0.6 }}>{activity.module?.toUpperCase() || 'SYSTEM'}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5">
                      <div className="emptyState" style={{ padding: '80px 0', textAlign: 'center' }}>
                        <h3>No audit records</h3>
                        <p className="muted">System operations will be documented here automatically.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Pagination
          page={page}
          limit={limit}
          total={total}
          onPageChange={setPage}
          onLimitChange={(l) => {
            setLimit(l)
            setPage(1)
          }}
        />
        <style>{`
          .users-page-header { margin-bottom: 8px; }
          .users-title { font-size: 1.3rem; font-weight: 800; color: var(--text); margin-bottom: 2px; }
          .users-subtitle { font-size: 0.85rem; color: var(--text-dimmed); font-weight: 500; }
        `}</style>
      </section>
    </div>
  )
}
