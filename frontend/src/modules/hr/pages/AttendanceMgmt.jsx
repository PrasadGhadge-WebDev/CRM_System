import { useState, useEffect } from 'react'
import { api } from '../../../services/api'
import { Icon } from '../../../layouts/icons.jsx'
import { toast } from 'react-toastify'

export default function AttendanceMgmt() {
  const [reportData, setReportData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true)
        const res = await api.get(`/api/hr/attendance/report?month=${selectedMonth}&year=${selectedYear}`)
        setReportData(res || [])
      } catch (error) {
        toast.error('Failed to fetch attendance intelligence')
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [selectedMonth, selectedYear])

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const years = [2024, 2025, 2026]

  return (
    <div className="stack leadsListPage crmContent">
      <section className="leadsFullscreenShell">
        <header className="leadsHeader">
          <div>
            <h1 className="leadsTitle">Attendance Intelligence</h1>
            <p className="leadsDescription">Global personnel presence, shift adherence, and institutional efficiency.</p>
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
            <span className="muted">Calculating institutional metrics...</span>
          </div>
        ) : (
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
                          <div className="payee-avatar-mini" style={{ width: '32px', height: '32px' }}>{item.user_name?.charAt(0)}</div>
                          <div className="stack gap-0">
                            <span className="font-bold">{item.user_name}</span>
                            <span className="text-xs muted">{item.designation}</span>
                          </div>
                        </div>
                      </td>
                      <td><span className="status-pill-modern success">{item.present}</span></td>
                      <td><span className="status-pill-modern danger">{item.absent}</span></td>
                      <td><span className="status-pill-modern warning">{item.half_day}</span></td>
                      <td><span className="text-sm font-bold" style={{ color: '#f59e0b' }}>{item.late}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="v3-progress-bar" style={{ width: '60px' }}>
                            <div className="v3-progress-fill" style={{ width: `${item.efficiency}%`, background: 'var(--primary)' }} />
                          </div>
                          <span className="text-xs font-bold">{item.efficiency}%</span>
                        </div>
                      </td>
                      <td className="text-right"><span className="font-numeric-bold">{item.total_hours}h</span></td>
                    </tr>
                  )) : (
                    <tr><td colSpan="7" className="text-center p-12 muted">No records found for this period</td></tr>
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
        .v3-progress-bar { height: 6px; background: var(--bg-surface); border-radius: 10px; overflow: hidden; }
        .v3-progress-fill { height: 100%; transition: width 0.6s ease; }
      `}</style>
    </div>
  )
}
