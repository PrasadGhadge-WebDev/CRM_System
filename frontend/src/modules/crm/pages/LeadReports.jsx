import React, { useState, useEffect } from 'react'
import { Icon } from '../../../layouts/icons.jsx'
import SearchableSelect from '../components/SearchableSelect.jsx'
import { leadsApi } from '../../../services/leads.js'
import { usersApi } from '../../../services/users.js'
import { toast } from 'react-toastify'

export default function LeadReports() {
  const [reportType, setReportType] = useState('summary')
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: [],
    source: [],
    employees: []
  })
  
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState(null)

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    try {
      const res = await usersApi.list({ role: 'Employee' })
      setEmployees(res.items || [])
    } catch (err) {
      toast.error('Failed to load employees')
    }
  }

  const handleGenerate = async () => {
    setLoading(true)
    try {
      // For this demo, we'll fetch lead summary data
      const data = await leadsApi.getSummary(filters)
      setReportData(data)
      toast.success('Report generated successfully')
    } catch (err) {
      toast.error('Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const reportTypes = [
    { value: 'summary', label: 'Lead Summary Report' },
    { value: 'performance', label: 'Employee Performance' },
    { value: 'source', label: 'Source Analytics' },
    { value: 'followup', label: 'Follow-up Report' },
    { value: 'conversion', label: 'Conversion Report' }
  ]

  const statusOptions = [
    { value: 'New', label: 'New' },
    { value: 'Contacted', label: 'Contacted' },
    { value: 'Qualified', label: 'Qualified' },
    { value: 'Converted', label: 'Converted' },
    { value: 'Lost', label: 'Lost' },
    { value: 'Junk', label: 'Junk' }
  ]

  return (
    <div className="crm-fullscreen-shell">
      <div className="users-page-header">
        <h1 className="users-title">Advanced Reporting</h1>
        <p className="users-subtitle">Generate and export intelligence reports for your pipeline</p>
      </div>

      <div className="crm-profile-grid-desktop">
        {/* Configuration Panel */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 className="section-title-premium">
            <Icon name="settings" size={18} />
            Report Configuration
          </h3>
          
          <div className="sheet-content-container" style={{ marginTop: '20px' }}>
            <div className="form-sheet-grid" style={{ gridTemplateColumns: '1fr' }}>
              <div className="sheet-field">
                <label>Report Type</label>
                <SearchableSelect 
                  value={reportType}
                  onChange={setReportType}
                  options={reportTypes}
                  placeholder="Select Report"
                  icon="activity"
                />
              </div>

              <div className="sheet-field">
                <label>Date Range</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="date" 
                    className="crm-input" 
                    value={filters.startDate}
                    onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
                  />
                  <input 
                    type="date" 
                    className="crm-input" 
                    value={filters.endDate}
                    onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="sheet-field">
                <label>Filter by Status</label>
                <div className="checkbox-grid-premium">
                  {statusOptions.map(s => (
                    <label key={s.value} className="crm-checkbox-container">
                      <input 
                        type="checkbox" 
                        checked={filters.status.includes(s.value)}
                        onChange={(e) => {
                          const next = e.target.checked 
                            ? [...filters.status, s.value]
                            : filters.status.filter(x => x !== s.value)
                          setFilters(f => ({ ...f, status: next }))
                        }}
                      />
                      <span className="checkbox-label">{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="sheet-field">
                <label>Employee Scope</label>
                <SearchableSelect 
                  value={filters.employees[0] || ''}
                  onChange={val => setFilters(f => ({ ...f, employees: val ? [val] : [] }))}
                  options={[{ value: '', label: 'All Employees' }, ...employees.map(e => ({ value: e.id || e._id, label: e.name }))]}
                  placeholder="All Employees"
                  icon="user"
                />
              </div>

              <button 
                className="btn-premium vibrant" 
                style={{ marginTop: '10px', width: '100%' }}
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 className="section-title-premium" style={{ marginBottom: 0 }}>
              <Icon name="reports" size={18} />
              Report Preview
            </h3>
            {reportData && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-premium glass mini">
                  <Icon name="mail" size={14} />
                  CSV
                </button>
                <button className="btn-premium glass mini">
                  <Icon name="reports" size={14} />
                  PDF
                </button>
              </div>
            )}
          </div>

          {!reportData ? (
            <div className="empty-report-state">
              <Icon name="activity" size={48} style={{ opacity: 0.1 }} />
              <p className="muted">Configure and generate a report to see preview here.</p>
            </div>
          ) : (
            <div className="report-preview-content custom-scrollbar">
              <table className="table-premium">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th className="text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Total Leads Analyzed</td>
                    <td className="text-right">{reportData.total || 0}</td>
                  </tr>
                  {Object.entries(reportData.byStatus || {}).map(([name, count]) => (
                    <tr key={name}>
                      <td>Status: {name}</td>
                      <td className="text-right">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .checkbox-grid-premium {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          padding: 16px;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 12px;
        }

        .empty-report-state {
          height: 400px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
          background: rgba(255,255,255,0.02);
          border: 2px dashed var(--border);
          border-radius: 20px;
        }

        .report-preview-content {
          max-height: 500px;
          overflow-y: auto;
        }

        .mini {
          padding: 6px 12px !important;
          font-size: 0.75rem !important;
        }
      `}</style>
    </div>
  )
}
