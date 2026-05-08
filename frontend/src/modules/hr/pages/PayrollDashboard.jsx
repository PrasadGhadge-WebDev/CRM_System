import { useEffect, useState } from 'react'
import { Icon } from '../../../layouts/icons'
import { api } from '../../../services/api'
import { toast } from 'react-toastify'
import { formatCurrency } from '../../../utils/formatters'

export default function PayrollDashboard() {
  const [salaries, setSalaries] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalOutlay: 0, employeeCount: 0, pendingPayouts: 0 })

  useEffect(() => {
    const loadPayroll = async () => {
      try {
        const res = await api.get('/api/hr/payroll/summary')
        setSalaries(res.history || [])
        setStats(res.stats || { totalOutlay: 0, employeeCount: 0, pendingPayouts: 0 })
      } catch (err) {
        toast.error('Failed to load payroll data')
      } finally {
        setLoading(false)
      }
    }
    loadPayroll()
  }, [])

  return (
    <div className="stack leadsListPage crmContent">
      <section className="leadsFullscreenShell">
        <header className="leadsHeader">
          <div>
            <h1 className="leadsTitle">Payroll & Compensation</h1>
            <p className="leadsDescription">Manage salary structures, generate payouts, and audit institutional compensation.</p>
          </div>
          <div className="leadsHeaderActions">
            <button className="btn-premium action-vibrant" onClick={() => toast.info('Payroll generation logic initiated')}>
              <Icon name="billing" />
              <span>Generate Salary Cycle</span>
            </button>
          </div>
        </header>

        <div className="dashboard-metrics-premium">
          <div className="metric-card-premium glass-panel">
            <div className="metric-icon-premium" style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}>
              <Icon name="billing" color="white" />
            </div>
            <div className="metric-details-premium">
              <span className="metric-label-premium">Total Monthly Outlay</span>
              <div className="metric-value-premium">{formatCurrency(stats.totalOutlay)}</div>
              <div className="metric-trend-premium positive">Budgeted Expenditure</div>
            </div>
          </div>

          <div className="metric-card-premium glass-panel">
            <div className="metric-icon-premium" style={{ background: 'linear-gradient(135deg, #4f46e5, #818cf8)' }}>
              <Icon name="users" color="white" />
            </div>
            <div className="metric-details-premium">
              <span className="metric-label-premium">Payroll Recipients</span>
              <div className="metric-value-premium">{stats.employeeCount}</div>
              <div className="metric-trend-premium">Active Contracts</div>
            </div>
          </div>

          <div className="metric-card-premium glass-panel">
            <div className="metric-icon-premium" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}>
              <Icon name="activity" color="white" />
            </div>
            <div className="metric-details-premium">
              <span className="metric-label-premium">Pending Payouts</span>
              <div className="metric-value-premium">{stats.pendingPayouts}</div>
              <div className="metric-trend-premium warning">Requires Authorization</div>
            </div>
          </div>
        </div>

        <section className="intel-card glass-panel" style={{ marginTop: '24px' }}>
          <div className="card-header-premium">
            <Icon name="reports" />
            <h3>Salary Disbursement History</h3>
          </div>
          <div className="card-body-premium">
            {loading ? (
              <div className="p-12 text-center"><div className="spinner-medium" /></div>
            ) : (
              <table className="table-premium">
                <thead>
                  <tr>
                    <th>MONTH</th>
                    <th>EMPLOYEE</th>
                    <th>BASE SALARY</th>
                    <th>ALLOWANCES</th>
                    <th>DEDUCTIONS</th>
                    <th>NET PAYOUT</th>
                    <th className="text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {salaries.length ? salaries.map(sal => (
                    <tr key={sal._id}>
                      <td><span className="font-bold text-sm">{sal.month} {sal.year}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="payee-avatar-mini" style={{ width: '32px', height: '32px' }}>{sal.employee_name?.charAt(0)}</div>
                          <span className="font-bold">{sal.employee_name}</span>
                        </div>
                      </td>
                      <td><span className="font-numeric">{formatCurrency(sal.basic_salary)}</span></td>
                      <td><span className="text-xs font-bold" style={{ color: '#10b981' }}>+ {formatCurrency(sal.allowances)}</span></td>
                      <td><span className="text-xs font-bold" style={{ color: '#ef4444' }}>- {formatCurrency(sal.deductions)}</span></td>
                      <td><span className="font-numeric-bold" style={{ color: 'var(--primary)' }}>{formatCurrency(sal.net_salary)}</span></td>
                      <td className="text-right">
                        <button className="action-btn-mini" title="Download Payslip"><Icon name="download" size={14} /></button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="7" className="text-center p-12 muted">No historical payroll data found</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </section>

      <style>{`
        .leadsHeader { margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
        .leadsTitle { font-size: 1.8rem; font-weight: 900; background: linear-gradient(135deg, var(--text) 0%, var(--text-dimmed) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .leadsDescription { color: var(--text-dimmed); font-size: 0.9rem; font-weight: 500; }
        .dashboard-metrics-premium { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin: 32px 0; }
        .metric-card-premium { padding: 24px; border-radius: 24px; display: flex; align-items: center; gap: 20px; }
        .metric-icon-premium { width: 48px; height: 48px; border-radius: 16px; display: flex; align-items: center; justify-content: center; }
        .metric-details-premium { display: flex; flex-direction: column; gap: 4px; }
        .metric-label-premium { font-size: 0.65rem; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.05em; }
        .metric-value-premium { font-size: 1.5rem; font-weight: 900; color: var(--text); }
        .metric-trend-premium { font-size: 0.7rem; font-weight: 600; color: var(--text-dimmed); }
      `}</style>
    </div>
  )
}
