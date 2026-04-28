import { useEffect, useState } from 'react'
import { activitiesApi } from '../../../services/activities'
import PageHeader from '../../../components/PageHeader'
import Pagination from '../../../components/Pagination'
import { Icon } from '../../../layouts/icons'
import { useToastFeedback } from '../../../utils/useToastFeedback'

export default function ActivityLogs() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useToastFeedback({ error })

  useEffect(() => {
    let canceled = false
    setLoading(true)
    setError('')

    activitiesApi
      .list({ page, limit })
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
  }, [page, limit])

  return (
    <div className="stack">
      <section className="crm-fullscreen-shell">
        <PageHeader
          title="Institutional Audit"
          description="Track system-wide actions, data state changes, and personnel operations in real-time."
          backTo="/"
        />

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
      </section>
    </div>
  )
}
