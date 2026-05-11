import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import { Icon } from '../../../layouts/icons.jsx'
import { toast } from 'react-toastify'
import { useAuth } from '../../../context/AuthContext'
import { FiClock, FiLogIn, FiLogOut, FiCalendar, FiActivity, FiUser, FiMapPin, FiInfo } from 'react-icons/fi'

export default function AttendanceMgmt() {
  const { user } = useAuth()
  const isEmployee = user?.role === 'Employee' || user?.role === 'Support'
  const isAdminOrHR = user?.role === 'Admin' || user?.role === 'HR' || user?.role === 'Manager'

  const [reportData, setReportData] = useState([])
  const [personalHistory, setPersonalHistory] = useState({ records: [], stats: {} })
  const [todayStatus, setTodayStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const fetchAttendance = async () => {
    try {
      setLoading(true)
      if (isAdminOrHR && !isEmployee) {
        const res = await api.get(`/api/attendance/report?month=${selectedMonth}&year=${selectedYear}`)
        setReportData(res || [])
      } else {
        const [history, today] = await Promise.all([
          api.get(`/api/attendance/my-history?month=${selectedMonth}&year=${selectedYear}`),
          api.get('/api/attendance/today')
        ])
        setPersonalHistory(history || { records: [], stats: {} })
        setTodayStatus(today)
      }
    } catch (error) {
      toast.error('Failed to fetch attendance data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAttendance()
  }, [selectedMonth, selectedYear, isAdminOrHR, isEmployee])

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const years = [2024, 2025, 2026]

  const handleCheckIn = async () => {
    try {
      setActionLoading(true)
      await api.post('/api/attendance/check-in')
      toast.success('Check-in successful! Have a great day.')
      fetchAttendance()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCheckOut = async () => {
    try {
      setActionLoading(true)
      await api.post('/api/attendance/check-out')
      toast.success('Check-out successful! Well done.')
      fetchAttendance()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-out failed')
    } finally {
      setActionLoading(false)
    }
  }

  const renderEmployeeView = () => (
    <div className="attendance-employee-layout animate-fade-in">
      {/* 🚀 Quick Actions & Today Status */}
      <div className="attendance-hero-grid">
        <div className="today-status-card shadow-soft">
          <div className="card-accent" />
          <div className="status-main">
            <div className="status-icon-box">
              <FiClock size={32} />
            </div>
            <div className="status-info">
              <h3>Today's Presence</h3>
              <p className="muted">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
          
          <div className="time-display-grid">
            <div className="time-box">
              <label>CHECK-IN</label>
              <span>{todayStatus?.check_in ? new Date(todayStatus.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
            </div>
            <div className="time-box">
              <label>CHECK-OUT</label>
              <span>{todayStatus?.check_out ? new Date(todayStatus.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
            </div>
            <div className="time-box">
              <label>WORKING HOURS</label>
              <span className="accent">{todayStatus?.working_hours || '0.00'}h</span>
            </div>
          </div>

          <div className="action-buttons">
            {!todayStatus?.check_in ? (
              <button className="crm-btn-premium success full-width" onClick={handleCheckIn} disabled={actionLoading}>
                <FiLogIn /> <span>{actionLoading ? 'Processing...' : 'Mark Check-in'}</span>
              </button>
            ) : !todayStatus?.check_out ? (
              <button className="crm-btn-premium danger full-width" onClick={handleCheckOut} disabled={actionLoading}>
                <FiLogOut /> <span>{actionLoading ? 'Processing...' : 'Mark Check-out'}</span>
              </button>
            ) : (
              <div className="completion-badge">
                <FiActivity /> <span>Day Completed</span>
              </div>
            )}
          </div>
        </div>

        {/* 📊 Performance Summary */}
        <div className="performance-summary-card shadow-soft">
          <div className="card-header-premium">
            <FiActivity />
            <span>Monthly Performance Metrics</span>
          </div>
          <div className="stats-grid-modern">
            <div className="stat-card-mini">
              <label>PRESENT</label>
              <span className="val success">{personalHistory.stats?.present || 0}</span>
            </div>
            <div className="stat-card-mini">
              <label>ABSENT</label>
              <span className="val danger">{personalHistory.stats?.absent || 0}</span>
            </div>
            <div className="stat-card-mini">
              <label>LATE MARKS</label>
              <span className="val warning">{personalHistory.stats?.late || 0}</span>
            </div>
            <div className="stat-card-mini">
              <label>OVERTIME</label>
              <span className="val primary">{personalHistory.stats?.overtime || 0}h</span>
            </div>
          </div>
          <div className="leave-balance-link">
            <Icon name="calendar" size={14} />
            <span>View detailed leave balance & history</span>
          </div>
        </div>
      </div>

      {/* 🧾 Daily Attendance Log */}
      <div className="tableWrap shadow-soft mt-32">
        <div className="table-header-premium">
          <div className="title-stack">
            <h3>Attendance Log</h3>
            <p>Detailed breakdown of daily presence and working metrics</p>
          </div>
          <div className="header-actions">
            <button className="crm-btn-premium secondary btn-sm" onClick={() => toast.info('Correction request feature coming soon!')}>
              <FiInfo /> <span>Request Correction</span>
            </button>
          </div>
        </div>
        <div className="leadsTableScroll">
          <table className="table-premium">
            <thead>
              <tr>
                <th>DATE</th>
                <th>CHECK-IN</th>
                <th>CHECK-OUT</th>
                <th>WORKING HOURS</th>
                <th>STATUS</th>
                <th>LATE MARK</th>
                <th className="text-right">OVERTIME</th>
              </tr>
            </thead>
            <tbody>
              {personalHistory.records?.length ? personalHistory.records.map((r, i) => (
                <tr key={i}>
                  <td><span className="font-bold">{new Date(r.date).toLocaleDateString()}</span></td>
                  <td><span className="muted">{r.check_in ? new Date(r.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span></td>
                  <td><span className="muted">{r.check_out ? new Date(r.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span></td>
                  <td><span className="font-numeric-bold">{r.working_hours}h</span></td>
                  <td>
                    <span className={`status-pill-modern ${r.status === 'Present' ? 'success' : r.status === 'Absent' ? 'danger' : 'warning'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>{r.late_mark ? <span className="status-pill-modern warning">YES</span> : <span className="muted">NO</span>}</td>
                  <td className="text-right"><span className={r.overtime_hours > 0 ? 'text-primary font-bold' : 'muted'}>{r.overtime_hours || 0}h</span></td>
                </tr>
              )) : (
                <tr><td colSpan="7" className="text-center p-32 muted">No activity logged for this period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const renderAdminView = () => (
    <div className="tableWrap leadsTableWrap shadow-soft">
      <div className="leadsTableScroll">
        <table className="table-premium">
          <thead>
            <tr>
              <th>EMPLOYEE</th>
              <th>PRESENT</th>
              <th>ABSENT</th>
              <th>HALF DAY</th>
              <th>LATE</th>
              <th>EFFICIENCY</th>
              <th className="text-right">TOTAL HOURS</th>
            </tr>
          </thead>
          <tbody>
            {reportData.length ? reportData.map((item, idx) => (
              <tr key={idx}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="payee-avatar-mini" style={{ width: '32px', height: '32px' }}>{item.employee?.name?.charAt(0)}</div>
                    <div className="stack gap-0">
                      <span className="font-bold">{item.employee?.name}</span>
                      <span className="text-xs muted">{item.employee?.role}</span>
                    </div>
                  </div>
                </td>
                <td><span className="status-pill-modern success">{item.stats?.Present || 0}</span></td>
                <td><span className="status-pill-modern danger">{item.stats?.Absent || 0}</span></td>
                <td><span className="status-pill-modern warning">{item.stats?.['Half Day'] || 0}</span></td>
                <td><span className="text-sm font-bold" style={{ color: '#f59e0b' }}>{item.stats?.Late || 0}</span></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="v3-progress-bar" style={{ width: '60px' }}>
                      <div className="v3-progress-fill" style={{ width: `${Math.min(100, (item.stats?.totalHours || 0) / 1.6)}%`, background: 'var(--primary)' }} />
                    </div>
                    <span className="text-xs font-bold">{Math.min(100, (item.stats?.totalHours || 0) / 1.6).toFixed(0)}%</span>
                  </div>
                </td>
                <td className="text-right"><span className="font-numeric-bold">{item.stats?.totalHours?.toFixed(1) || 0}h</span></td>
              </tr>
            )) : (
              <tr><td colSpan="7" className="text-center p-12 muted">No records found for this period</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="stack leadsListPage crmContent">
      <section className="leadsFullscreenShell">
        <header className="leadsHeader">
          <div>
            <h1 className="leadsTitle">{isEmployee && !isAdminOrHR ? 'My Attendance' : 'Attendance Intelligence'}</h1>
            <p className="leadsDescription">
              {isEmployee && !isAdminOrHR 
                ? 'Track your daily presence, working hours, and institutional performance.' 
                : 'Global personnel presence, shift adherence, and institutional efficiency.'}
            </p>
          </div>
          <div className="leadsHeaderActions">
             <div className="search-filter-group">
                <select className="crm-input filter-select" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                  {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <select className="crm-input filter-select" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
             </div>
          </div>
        </header>

        {loading ? (
          <div className="leadsLoadingState">
            <div className="spinner-medium" />
            <span className="muted">Calculating metrics...</span>
          </div>
        ) : (
          isEmployee && !isAdminOrHR ? renderEmployeeView() : renderAdminView()
        )}
      </section>

      <style>{`
        .leadsHeader { margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-start; }
        .leadsTitle { font-size: 2.2rem; font-weight: 900; background: linear-gradient(135deg, var(--text) 0%, var(--text-dimmed) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .leadsDescription { color: var(--text-dimmed); font-size: 1rem; font-weight: 500; }
        
        .attendance-hero-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
        .today-status-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 24px; padding: 32px; position: relative; overflow: hidden; }
        .card-accent { position: absolute; top: 0; left: 0; width: 100%; height: 6px; background: var(--primary); }
        .status-main { display: flex; align-items: center; gap: 20px; margin-bottom: 32px; }
        .status-icon-box { width: 64px; height: 64px; border-radius: 16px; background: var(--primary-soft); color: var(--primary); display: flex; align-items: center; justify-content: center; }
        .status-info h3 { font-size: 1.4rem; font-weight: 800; color: var(--text); margin: 0; }
        
        .time-display-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
        .time-box { background: var(--bg-surface); border: 1px solid var(--border-subtle); padding: 16px; border-radius: 16px; display: flex; flex-direction: column; gap: 4px; }
        .time-box label { font-size: 0.65rem; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; }
        .time-box span { font-size: 1.2rem; font-weight: 900; color: var(--text); }
        .time-box span.accent { color: var(--primary); }

        .performance-summary-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 24px; padding: 32px; display: flex; flex-direction: column; }
        .stats-grid-modern { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; flex-grow: 1; margin: 24px 0; }
        .stat-card-mini { background: var(--bg-surface); border: 1px solid var(--border-subtle); padding: 20px; border-radius: 16px; display: flex; flex-direction: column; gap: 8px; }
        .stat-card-mini label { font-size: 0.7rem; font-weight: 800; color: var(--text-dimmed); }
        .stat-card-mini .val { font-size: 1.8rem; font-weight: 900; }
        .stat-card-mini .val.success { color: var(--success); }
        .stat-card-mini .val.danger { color: var(--danger); }
        .stat-card-mini .val.warning { color: var(--warning); }
        .stat-card-mini .val.primary { color: var(--primary); }

        .leave-balance-link { display: flex; align-items: center; gap: 12px; padding: 16px; background: var(--bg-surface); border: 1px dashed var(--border-strong); border-radius: 12px; color: var(--text-dimmed); font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .leave-balance-link:hover { color: var(--primary); border-color: var(--primary); background: var(--primary-soft); }

        .completion-badge { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 16px; background: var(--success-soft); border: 1px solid var(--success-border); color: var(--success); border-radius: 12px; font-weight: 800; }
        
        .mt-32 { margin-top: 32px; }
        .v3-progress-bar { height: 6px; background: var(--bg-surface); border-radius: 10px; overflow: hidden; }
        .v3-progress-fill { height: 100%; transition: width 0.6s ease; }

        @media (max-width: 900px) {
          .attendance-hero-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
