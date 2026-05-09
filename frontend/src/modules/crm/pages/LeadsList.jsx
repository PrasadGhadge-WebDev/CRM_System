import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import PageHeader from '../../../components/PageHeader.jsx'
import Pagination from '../../../components/Pagination.jsx'
import { Icon } from '../../../layouts/icons.jsx'
import { leadsApi } from '../../../services/leads.js'
import { statusesApi } from '../../../services/statuses.js'
import { usersApi } from '../../../services/users.js'
import { confirmToast } from '../../../utils/confirmToast.jsx'
import { useAuth } from '../../../context/AuthContext'
import { useDebouncedValue } from '../../../utils/useDebouncedValue.js'
import { useToastFeedback } from '../../../utils/useToastFeedback.js'
import FollowupModal from '../../../components/FollowupModal.jsx'
import LeadNoteModal from '../components/LeadNoteModal.jsx'
import LeadAssignModal from '../components/LeadAssignModal.jsx'
import DealModal from '../components/DealModal.jsx'
import StatusDropdown from '../components/StatusDropdown.jsx'
import DeleteConfirmModal from '../components/DeleteConfirmModal.jsx'
import SearchableSelect from '../components/SearchableSelect.jsx'
import ModernSearchBar from '../../../components/ModernSearchBar.jsx'

import { notesApi } from '../../../services/notes.js'

function stopRowNavigation(event) {
  event.stopPropagation()
}

export default function LeadsList() {

  const [followupLead, setFollowupLead] = useState(null)
  const [isFollowupOpen, setIsFollowupOpen] = useState(false)
  const [followupInitialTab, setFollowupInitialTab] = useState('form')

  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const isEmployee = (currentUser?.role || '') === 'Employee'
  const isAdmin = (currentUser?.role || '') === 'Admin'
  const isAdminOrManager = isAdmin || (currentUser?.role || '') === 'Manager'

  const qParam = searchParams.get('q') || ''
  const statusParam = searchParams.get('status') || ''
  const assignedToParam = searchParams.get('assignedTo') || ''
  const followupDateParam = searchParams.get('followupDate') || ''
  const pageParam = Math.max(1, Number(searchParams.get('page') || 1) || 1)
  const rawLimitParam = (searchParams.get('limit') || '20').trim().toLowerCase()
  const limitParam =
    rawLimitParam === 'all' ? 'all' : Math.min(100, Math.max(1, Number(rawLimitParam) || 20))

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [employees, setEmployees] = useState([])
  const [statusOptions, setStatusOptions] = useState([])

  const [q, setQ] = useState(qParam)
  const [status, setStatus] = useState(statusParam)
  const [assignedTo, setAssignedTo] = useState(assignedToParam)
  const [source, setSource] = useState(searchParams.get('source') || '')
  const [dateRange, setDateRange] = useState(searchParams.get('dateRange') || 'all')
  const [customDates, setCustomDates] = useState({ start: '', end: '' })
  const [followupDate, setFollowupDate] = useState(followupDateParam)
  const [page, setPage] = useState(pageParam)
  const [limit, setLimit] = useState(limitParam)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [summary, setSummary] = useState({ total: 0, byStatus: {} })
  const [selectedLeads, setSelectedLeads] = useState([])

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [noteLead, setNoteLead] = useState(null)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [isDealModalOpen, setIsDealModalOpen] = useState(false)
  const [convertedCustomerId, setConvertedCustomerId] = useState(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null) // { id: string, isBulk: boolean }

  useToastFeedback({ error })
  const debouncedQ = useDebouncedValue(q, 250)

  // Sync Modal with URL for refresh persistence
  useEffect(() => {
    const lId = searchParams.get('leadId')
    const action = searchParams.get('action')

    if (lId && (action === 'history' || action === 'followup')) {
      // Find lead in current items or fetch if not found
      const lead = items.find(i => (i.id === lId || i._id === lId))
      if (lead) {
        setFollowupLead(lead)
        setFollowupInitialTab(action === 'history' ? 'history' : 'form')
        setIsFollowupOpen(true)
      } else if (!loading && items.length > 0) {
        // If items are loaded but lead not found, clear params
        setSearchParams(prev => {
          prev.delete('leadId')
          prev.delete('action')
          return prev
        }, { replace: true })
      }
    } else {
      setIsFollowupOpen(false)
      setFollowupLead(null)
    }
  }, [searchParams, items, loading])

  useEffect(() => {
    statusesApi
      .list('lead')
      .then((res) => {
        const raw = Array.isArray(res) ? res : []
        const mapped = mappedStatusOptions(raw)
        setStatusOptions(mapped)
      })
      .catch(() => { })

    usersApi
      .list({ limit: 'all' })
      .then((res) => {
        const list = res?.items || []
        setEmployees(list.filter((u) => (u?.role || '').toLowerCase() === 'employee'))
      })
      .catch(() => { })

    // For Employees, we hardcode the status options to the new flow if they don't exist
    if (isEmployee) {
      const newFlow = ['New', 'Contacted', 'Follow-up', 'Qualified', 'Converted']
      setStatusOptions(newFlow.map(s => ({ value: s, label: s, color: 'var(--primary)' })))
    }
  }, [])

  const desiredParams = useMemo(() => {
    const next = new URLSearchParams()
    if (debouncedQ.trim()) next.set('q', debouncedQ.trim())
    if (status.trim()) next.set('status', status.trim())
    if (source.trim()) next.set('source', source.trim())
    if (dateRange !== 'all') next.set('dateRange', dateRange)
    if (assignedTo.trim()) next.set('assignedTo', assignedTo.trim())
    if (followupDate.trim()) next.set('followupDate', followupDate.trim())
    if (page > 1) next.set('page', String(page))
    if (String(limit) !== '20') next.set('limit', String(limit))
    
    // Preserve modal state if present
    const lId = searchParams.get('leadId')
    const act = searchParams.get('action')
    if (lId) next.set('leadId', lId)
    if (act) next.set('action', act)
    
    return next
  }, [debouncedQ, status, source, dateRange, assignedTo, followupDate, page, limit, searchParams])

  useEffect(() => {
    if (desiredParams.toString() !== searchParams.toString()) {
      setSearchParams(desiredParams, { replace: true })
    }
  }, [desiredParams, searchParams, setSearchParams])

  useEffect(() => {
    let canceled = false
    setLoading(true)
    setError('')

    // Date range calculation
    let startDate = ''
    let endDate = ''
    const today = new Date()
    today.setHours(0,0,0,0)

    if (dateRange === 'today') {
      startDate = today.toISOString()
      endDate = new Date(new Date().setHours(23,59,59,999)).toISOString()
    } else if (dateRange === 'yesterday') {
      const y = new Date(today)
      y.setDate(y.getDate() - 1)
      startDate = y.toISOString()
      const yEnd = new Date(y)
      yEnd.setHours(23,59,59,999)
      endDate = yEnd.toISOString()
    } else if (dateRange === 'week') {
      const w = new Date(today)
      w.setDate(w.getDate() - 7)
      startDate = w.toISOString()
    } else if (dateRange === 'month') {
      const m = new Date(today)
      m.setMonth(m.getMonth() - 1)
      startDate = m.toISOString()
    } else if (dateRange === 'custom' && customDates.start && customDates.end) {
      startDate = new Date(customDates.start).toISOString()
      endDate = new Date(new Date(customDates.end).setHours(23,59,59,999)).toISOString()
    }

    leadsApi
      .list({
        ...(debouncedQ.trim() ? { q: debouncedQ.trim() } : null),
        ...(status.trim() ? { status: status.trim() } : null),
        ...(source.trim() ? { source: source.trim() } : null),
        ...(startDate ? { startDate } : null),
        ...(endDate ? { endDate } : null),
        ...(assignedTo.trim() ? { assignedTo: assignedTo.trim() } : null),
        ...(followupDate.trim() ? { followupDate: followupDate.trim() } : null),
        page,
        limit,
        sort: '-created_at',
      })
      .then((res) => {
        if (canceled) return
        setItems(res.items || [])
        setTotal(Number(res.total) || 0)
        setSummary(res.summary || { total: 0, byStatus: {} })
        setSelectedLeads([])
      })
      .catch((e) => {
        if (canceled) return
        setError(e.message || 'Failed to load leads')
      })
      .finally(() => {
        if (canceled) return
        setLoading(false)
      })

    return () => {
      canceled = true
    }
  }, [debouncedQ, status, source, dateRange, customDates, assignedTo, followupDate, page, limit, refreshTrigger])

  const handleSelectAll = (checked) =>
    setSelectedLeads(checked ? items.map((lead) => String(lead.id || lead._id || '')) : [])

  const handleSelectLead = (id, checked) => {
    if (checked) {
      setSelectedLeads((prev) => [...new Set([...prev, String(id)])])
    } else {
      setSelectedLeads((prev) => prev.filter((item) => String(item) !== String(id)))
    }
  }

  const handleBulkAssign = async (assigneeId, reason) => {
    try {
      const res = await leadsApi.bulkUpdate({
        ids: selectedLeads,
        update: { assignedTo: assigneeId },
        reason
      })
      toast.success(res.message || `${selectedLeads.length} leads assigned successfully`)
      setSelectedLeads([])
      setIsAssignModalOpen(false)
      // Refresh list
      setPage(1)
      window.location.reload() // Simple refresh to update UI fully
    } catch (err) {
      toast.error(err.message || 'Failed to assign leads')
    }
  }
  async function onDelete(id) {
    setDeleteTarget({ id, isBulk: false })
    setIsDeleteModalOpen(true)
  }

  async function onBulkDelete() {
    if (selectedLeads.length === 0) return
    setDeleteTarget({ isBulk: true })
    setIsDeleteModalOpen(true)
  }

  async function confirmDelete(hard) {
    try {
      if (deleteTarget.isBulk) {
        await leadsApi.bulkDelete(selectedLeads, hard);
        toast.success(hard ? 'Leads permanently deleted' : 'Leads moved to trash');
        setItems(prev => prev.filter(item => !selectedLeads.includes(String(item.id || item._id))));
        setSelectedLeads([]);
      } else {
        await leadsApi.delete(deleteTarget.id, hard);
        toast.success(hard ? 'Lead permanently deleted' : 'Lead moved to trash');
        setItems(prev => prev.filter(item => String(item.id || item._id) !== String(deleteTarget.id)));
      }
      setIsDeleteModalOpen(false);
      // Trigger a re-fetch of stats/counts
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(err.message || 'Failed to delete');
    }
  }

  const openFollowup = (lead) => {
    setSearchParams(prev => {
      prev.set('leadId', lead.id || lead._id)
      prev.set('action', 'followup')
      return prev
    })
  }

  const openTimeline = (lead) => {
    setSearchParams(prev => {
      prev.set('leadId', lead.id || lead._id)
      prev.set('action', 'history')
      return prev
    })
  }

  const handleFollowupSaved = (updatedLead) => {
    const updatedId = String(updatedLead?.id || updatedLead?._id || '')
    if (!updatedId) return
    setItems((prev) =>
      prev.map((lead) => {
        const leadId = String(lead?.id || lead?._id || '')
        if (leadId !== updatedId) return lead
        return { ...lead, ...updatedLead }
      }),
    )
  }

  async function onUpdateStatus(id, newStatus) {
    if (newStatus === 'Converted') {
      return onConvertToCustomer(id)
    }
    try {
      await leadsApi.update(id, { status: newStatus })
      toast.success(`Status updated to ${newStatus}`)
      
      if (newStatus === 'Junk') {
        setItems(prev => prev.filter(item => (item.id !== id && item._id !== id)))
        setTotal(t => Math.max(0, t - 1))
      } else {
        setItems(prev => prev.map(item => (item.id === id || item._id === id) ? { ...item, status: newStatus } : item))
      }
    } catch (err) {
      toast.error(err.message || 'Update failed')
    }
  }


  async function onConvertToCustomer(id) {
    const lead = items.find(x => (x.id === id || x._id === id))
    if (!lead) return
    
    if (lead.status === 'Converted') {
      toast.info('This lead is already converted.')
      const targetId = lead.convertedCustomerId?.id || lead.convertedCustomerId?._id || lead.convertedCustomerId
      if (targetId) navigate(`/customers/${targetId}`)
      return
    }

    const confirmed = await confirmToast(`Convert ${lead.name} to a Customer?`, {
      confirmLabel: 'Convert Now',
      type: 'primary',
    })
    if (!confirmed) return

    try {
      const res = await leadsApi.update(id, { status: 'Converted' })
      toast.success('Lead converted successfully!')
      
      // Redirect to Customer Detail page
      if (res.convertedCustomerId || res.data?.convertedCustomerId) {
        const rawId = res.convertedCustomerId || res.data?.convertedCustomerId
        const custId = typeof rawId === 'object' ? (rawId.id || rawId._id) : rawId
        navigate(`/customers/${custId}`)
      } else {
        // Fallback if ID is not in response (though it should be)
        navigate('/customers')
      }
    } catch (e) {
      toast.error(e.message || 'Conversion failed')
    }
  }

  async function onConvertToDeal(lead) {
    if (lead.status === 'Converted') {
      const custId = lead.convertedCustomerId?.id || lead.convertedCustomerId?._id || lead.convertedCustomerId
      setConvertedCustomerId(custId)
      setIsDealModalOpen(true)
    } else {
      const confirmed = await confirmToast(`Convert ${lead.name} to a Customer and create a Deal?`, {
        confirmLabel: 'Convert & Create Deal',
        type: 'primary',
      })
      if (!confirmed) return

      try {
        const res = await leadsApi.update(lead.id || lead._id, { status: 'Converted' })
        const rawId = res.convertedCustomerId || res.data?.convertedCustomerId
        const custId = typeof rawId === 'object' ? (rawId.id || rawId._id) : rawId
        setConvertedCustomerId(custId)
        setIsDealModalOpen(true)
      } catch (e) {
        toast.error('Lead conversion failed')
      }
    }
  }

  const isAllSelected = items.length > 0 && selectedLeads.length === items.length
  const isSomeSelected = selectedLeads.length > 0 && selectedLeads.length < items.length

  const mappedStatusOptions = (raw) => {
    // If employee, enforce specific list
    if (isEmployee) {
       return [
         { value: 'New', label: 'New', color: '#3b82f6' },
         { value: 'Contacted', label: 'Contacted', color: '#8b5cf6' },
         { value: 'Follow-up', label: 'Follow-up', color: '#f59e0b' },
         { value: 'Qualified', label: 'Qualified', color: '#10b981' },
         { value: 'Converted', label: 'Converted', color: '#059669' }
       ]
    }
    return raw.map((s) => ({ value: s.name, label: s.name, color: s.color }))
  }

  const getPriorityColor = (p) => {
    switch(p) {
      case 'High': return '#ef4444';
      case 'Medium': return '#f59e0b';
      case 'Low': return '#3b82f6';
      default: return 'var(--text-dimmed)';
    }
  }

  return (
    <div className="stack">
      <section className="crm-fullscreen-shell">
        <div className="users-page-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 className="users-title">Leads Management</h1>
              <p className="users-subtitle">Track and optimize incoming customer opportunities</p>
            </div>
            <button
              className="btn-premium action-vibrant"
              onClick={() => navigate('/leads/new')}
            >
              <Icon name="plus" size={16} />
              <span>{isEmployee ? 'Create Lead' : 'Add Lead'}</span>
            </button>
          </div>
        </div>

        <div className="crm-stats-bar-compact overflow-x-auto pb-8">
          <div className={`stat-pill-mini clickable ${status === '' ? 'is-active' : ''}`} onClick={() => setStatus('')}>
            <span className="stat-pill-label">ALL LEADS</span>
            <span className="stat-pill-value total">{summary.total}</span>
          </div>
          {Object.entries(summary.byStatus).map(([name, count]) => (
            <div 
              key={name} 
              className={`stat-pill-mini clickable ${status === name ? 'is-active' : ''}`} 
              onClick={() => setStatus(name)}
            >
              <span className="stat-pill-label">{name.toUpperCase()}</span>
              <span className={`stat-pill-value ${String(name).toLowerCase()}`}>{count}</span>
            </div>
          ))}
        </div>

        <div className="unified-action-bar">
          <div className="search-filter-group">
            <ModernSearchBar
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
              placeholder="Search by name, email, phone, source, city, status, priority..."
            />

            <SearchableSelect
              value={status}
              onChange={(val) => { setStatus(val); setPage(1); }}
              options={[
                { value: '', label: 'Status: All' },
                ...(isEmployee 
                   ? [
                      { value: 'New', label: 'New' },
                      { value: 'Contacted', label: 'Contacted' },
                      { value: 'Follow-up', label: 'Follow-up' },
                      { value: 'Qualified', label: 'Qualified' },
                      { value: 'Converted', label: 'Converted' }
                     ]
                   : (statusOptions.length > 0 
                      ? statusOptions 
                      : Object.keys(summary.byStatus).map(name => ({ value: name, label: name }))
                     )
                )
              ]}
              placeholder="Status: All"
              icon="activity"
            />

            <SearchableSelect
              value={source}
              onChange={(val) => { setSource(val); setPage(1); }}
              options={['all', 'FB', 'Website', 'Google', 'Referral', 'Call', 'Email', 'Walk-in', 'Other']}
              placeholder="Source: All"
              icon="activity"
            />

            <SearchableSelect
              value={dateRange}
              onChange={(val) => { setDateRange(val); setPage(1); }}
              options={[
                { value: 'all', label: 'Date: All' },
                { value: 'today', label: 'Today' },
                { value: 'yesterday', label: 'Yesterday' },
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' },
                { value: 'custom', label: 'Custom Range' }
              ]}
              placeholder="Date: All"
              icon="calendar"
            />

            {dateRange === 'custom' && (
              <div className="flex items-center gap-4 animate-fade-in">
                <input 
                  type="date" 
                  className="crm-input date-mini" 
                  value={customDates.start} 
                  onChange={e => setCustomDates(prev => ({ ...prev, start: e.target.value }))}
                />
                <span className="muted" style={{ fontSize: '0.7rem' }}>to</span>
                <input 
                  type="date" 
                  className="crm-input date-mini" 
                  value={customDates.end} 
                  onChange={e => setCustomDates(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            )}

            {!isEmployee && (
              <SearchableSelect
                value={assignedTo}
                onChange={(val) => { setAssignedTo(val); setPage(1); }}
                options={[{ value: '', label: 'All Employees' }, ...employees.map(e => ({ value: e.id || e._id, label: e.name }))]}
                placeholder="All Employees"
                icon="user"
              />
            )}

            {selectedLeads.length > 0 && isAdminOrManager && (
              <button
                className="btn-premium-mini bulk-assign-btn"
                onClick={() => setIsAssignModalOpen(true)}
              >
                <Icon name="user" size={14} />
                <span>Assign Leads</span>
                <span className="selection-count">{selectedLeads.length}</span>
              </button>
            )}



          </div>
        </div>

        {error ? <div className="alert error glass-alert">{error}</div> : null}

        {loading ? (
          <div className="leadsLoadingState">
            <div className="spinner-medium" />
            <span className="muted">Loading leads...</span>
          </div>
        ) : (
          <>
            <div className="crm-table-wrap shadow-soft" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="crm-table-scroll">
                <table className="crm-table">
                  <thead style={{ background: 'var(--bg-surface)' }}>
                    <tr>
                      <th style={{ width: '50px' }}>
                        <input
                          type="checkbox"
                          checked={selectedLeads.length === items.length && items.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                      </th>
                      <th style={{ minWidth: '180px' }}>NAME</th>
                      <th style={{ minWidth: '180px' }}>MOBILE NUMBER</th>
                      <th style={{ minWidth: '140px' }} className="tablet-hide">ASSIGNED TO</th>
                      <th style={{ minWidth: '120px' }}>FOLLOW-UP</th>
                      <th style={{ width: '120px' }}>STATUS</th>
                      {!isEmployee && <th style={{ minWidth: '140px' }} className="tablet-hide">CREATED BY / DATE</th>}
                      <th className="text-right" style={{ width: '140px' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length > 0 ? (
                      items.map((lead) => {
                        const id = lead.id || lead._id
                        const isSelected = selectedLeads.includes(String(id))
                        const nextDate = lead.nextFollowupDate ? new Date(lead.nextFollowupDate) : null
                        const today = new Date().setHours(0, 0, 0, 0)
                        const isOverdue = nextDate && nextDate < today
                        const isToday = nextDate && new Date(nextDate).setHours(0, 0, 0, 0) === today

                        return (
                          <tr
                            key={String(id)}
                            className={`crm-table-row ${isSelected ? 'selected' : ''}`}
                            onClick={() => navigate(`/leads/${id}`)}
                          >

                            <td onClick={stopRowNavigation}>
                              <input
                                type="checkbox"
                                checked={selectedLeads.includes(id)}
                                onChange={(e) => handleSelectLead(id, e.target.checked)}
                              />
                            </td>

                            <td>
                              <div className="leadsPrimaryText">{lead.name || '—'}</div>
                              <div className="leadsSecondaryText" style={{ color: 'var(--primary)', fontWeight: 700 }}>{lead.source || 'Other'}</div>
                            </td>

                            <td>
                              <div className="leadsContactCell">
                                <div className="contactMain">{lead.phone || '—'}</div>
                                <div className="contactQuickActions">
                                   <a href={`tel:${lead.phone}`} className="action-icon-mini phone" onClick={stopRowNavigation} title="Call"><Icon name="phone" size={12} /></a>
                                   <a href={`https://wa.me/${lead.phone?.replace(/\D/g, '')}`} target="_blank" className="action-icon-mini whatsapp" onClick={stopRowNavigation} title="WhatsApp"><Icon name="whatsapp" size={12} /></a>
                                   <a href={`mailto:${lead.email}`} className="action-icon-mini email" onClick={stopRowNavigation} title="Email"><Icon name="mail" size={12} /></a>
                                </div>
                              </div>
                            </td>



                            <td className="tablet-hide">
                              <div className="leadsOwnerCell">
                                <span className="ownerName">{lead.assignedTo?.name || 'Unassigned'}</span>
                                <span className="ownerRole">{lead.assignedTo?.role || ''}</span>
                              </div>
                            </td>


                            <td className="tablet-hide">
                              <div className={`leadsFollowupCell ${isOverdue ? 'is-overdue' : ''} ${isToday ? 'is-today' : ''}`}>
                                <div className="followupDate">
                                  {nextDate ? nextDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'None'}
                                </div>
                                {nextDate && (
                                  <div className="followupTime">
                                    {isToday ? 'TODAY at ' : ''}
                                    {nextDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                )}
                              </div>
                            </td>

                            <td>
                                <StatusDropdown 
                                  status={lead.status} 
                                  options={statusOptions.length > 0 
                                    ? statusOptions.map(s => ({ name: s.label, color: s.color }))
                                    : Object.keys(summary.byStatus).map(name => ({ name, color: 'var(--primary)' }))
                                  } 
                                  onChange={(newStatus) => onUpdateStatus(id, newStatus)}
                                  bypassRules={isAdmin}
                                  disabled={lead.status === 'Converted' && !isAdmin}
                                />
                            </td>

                            {/* Created field removed for employees to save space */}
                            {!isEmployee && (
                              <td className="tablet-hide">
                                <div className="leadsOwnerCell">
                                  <span className="ownerName">{lead.createdBy?.name || 'System'}</span>
                                  <span className="ownerRole">{lead.created_at ? new Date(lead.created_at).toLocaleDateString() : ''}</span>
                                </div>
                              </td>
                            )}
                            <td className="text-right" onClick={stopRowNavigation}>
                              <div className="crm-action-group">
                                {true && (
                                  <>
                                    <button
                                      className="modern-action-btn"
                                      onClick={() => navigate(`/leads/${id}/edit`)}
                                      title="Edit Lead"
                                    >
                                      <Icon name="edit" size={14} />
                                    </button>
                                    
                                    {isAdmin && (
                                      <button
                                        className="modern-action-btn danger"
                                        onClick={() => onDelete(id)}
                                        title="Delete Lead"
                                      >
                                        <Icon name="trash" size={14} />
                                      </button>
                                    )}
                                  </>
                                )}

                                <details className="crm-actions-overflow">
                                  <summary className="modern-action-btn" title="More Options">
                                    <Icon name="more-vertical" size={14} />
                                  </summary>
                                  <div className="overflow-menu-content shadow-soft">
                                    {(isAdminOrManager || (isEmployee && String(lead.assignedTo?.id || lead.assignedTo?._id) === String(currentUser?.id))) && true && (
                                      <>

                                        <button className="overflow-item" onClick={() => openFollowup(lead)}>
                                          <Icon name="calendar" size={14} />
                                          <span>Schedule Follow up</span>
                                        </button>
                                      </>
                                    )}

                                    <button className="overflow-item" onClick={() => openTimeline(lead)}>
                                      <Icon name="activity" size={14} />
                                      <span>History</span>
                                    </button>

                                    {lead.status !== 'Converted' ? (
                                      <>
                                        <button className="overflow-item" onClick={() => onConvertToCustomer(id)}>
                                          <Icon name="refresh" size={14} />
                                          <span>Convert to Customer</span>
                                        </button>
                                        <button className="overflow-item" onClick={() => onConvertToDeal(lead)}>
                                          <Icon name="activity" size={14} />
                                          <span>Convert to Deal</span>
                                        </button>
                                      </>
                                    ) : (
                                      <button 
                                        className="overflow-item primary"
                                        onClick={() => {
                                          const rawId = lead.convertedCustomerId;
                                          const custId = typeof rawId === 'object' ? (rawId.id || rawId._id) : rawId;
                                          navigate(`/customers/${custId}`);
                                        }}
                                      >
                                        <Icon name="user" size={14} />
                                        <span>Go to Customer Profile</span>
                                      </button>
                                    )}

                                    {isAdmin && (
                                      <button className="overflow-item danger" onClick={() => onDelete(id)}>
                                        <Icon name="trash" size={14} />
                                        <span>Delete Lead</span>
                                      </button>
                                    )}
                                  </div>
                                </details>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={isAdminOrManager ? 8 : 7}>
                          <div className="emptyState" style={{ padding: '80px 0' }}>
                            <h3>No leads found</h3>
                            <p className="muted">Try a different search or add a new lead.</p>
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
              onPageChange={(p) => setPage(Math.max(1, p))}
              onLimitChange={(l) => {
                setLimit(l)
                setPage(1)
              }}
            />
          </>
        )}
      </section>

      <FollowupModal
        isOpen={isFollowupOpen}
        lead={followupLead}
        initialTab={followupInitialTab}
        onClose={() => {
          setSearchParams(prev => {
            prev.delete('leadId')
            prev.delete('action')
            return prev
          })
        }}
        onSave={handleFollowupSaved}
      />

      <DealModal 
        isOpen={isDealModalOpen}
        customerId={convertedCustomerId}
        onClose={() => setIsDealModalOpen(false)}
        onSave={(newDeal) => {
          setIsDealModalOpen(false)
          // Removed redundant toast as DealModal already handles it
          navigate('/deals')
        }}
      />

      <LeadNoteModal
        isOpen={isNoteModalOpen}
        lead={noteLead}
        onClose={() => setIsNoteModalOpen(false)}
        onSaved={() => {
          setIsNoteModalOpen(false)
          // No reload needed for just a note usually, but timeline would need it
        }}
      />

      <LeadAssignModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onAssign={handleBulkAssign}
        employees={employees}
        selectedCount={selectedLeads.length}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        isAdmin={isAdmin}
        title={deleteTarget?.isBulk ? "Bulk Delete Leads" : "Delete Lead"}
        message={deleteTarget?.isBulk ? `Are you sure you want to delete ${selectedLeads.length} leads?` : "Are you sure you want to delete this lead?"}
      />

      <style>{`
        .tableAvatarFallback { width: 44px; height: 44px; border-radius: 14px; background: linear-gradient(135deg, var(--primary-soft), rgba(59, 130, 246, 0.2)); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.1); }
        .leadsIdentityCell { display: flex; flex-direction: column; gap: 2px; }
        .leadsPrimaryText { color: var(--text); font-size: 0.95rem; font-weight: 700; }
        .leadsSecondaryText { color: var(--text-dimmed); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
        
        .leadsContactCell { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
        .contactMain { color: var(--text); font-size: 0.85rem; font-weight: 800; white-space: nowrap; }
        .contactQuickActions { display: flex; gap: 6px; }
        .action-icon-mini { 
          width: 28px; 
          height: 28px; 
          border-radius: 8px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          background: var(--bg-surface); 
          color: var(--text-dimmed); 
          border: 1px solid var(--border-subtle);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .action-icon-mini.phone { color: #3b82f6; background: #eff6ff; border-color: #bfdbfe; }
        .action-icon-mini.whatsapp { color: #22c55e; background: #f0fdf4; border-color: #bbf7d0; }
        .action-icon-mini.email { color: #ef4444; background: #fef2f2; border-color: #fecaca; }
        
        .action-icon-mini:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .action-icon-mini.phone:hover { background: #3b82f6; color: white; border-color: #3b82f6; }
        .action-icon-mini.whatsapp:hover { background: #22c55e; color: white; border-color: #22c55e; }
        .action-icon-mini.email:hover { background: #ef4444; color: white; border-color: #ef4444; }

        .leadsOwnerCell { display: flex; flex-direction: column; gap: 2px; }
        .ownerName { color: var(--text); font-size: 0.85rem; font-weight: 700; }
        .ownerRole { color: var(--text-dimmed); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }

        .leadsFollowupCell { display: flex; flex-direction: column; gap: 2px; }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .gap-8 { gap: 8px; }
        .gap-12 { gap: 12px; }
        .priority-badge { 
          display: inline-flex; 
          padding: 2px 10px; 
          border-radius: 6px; 
          font-size: 0.65rem; 
          font-weight: 800; 
          text-transform: uppercase; 
          border: 1px solid transparent;
        }
        .mt-4 { margin-top: 4px; }
        .leadsFollowupCell.is-overdue .followupDate { color: var(--danger); font-weight: 800; }
        .leadsFollowupCell.is-today .followupDate { color: var(--warning); font-weight: 800; }
        .followupDate { color: var(--text); font-size: 0.85rem; font-weight: 700; }
        .followupTime { color: var(--text-dimmed); font-size: 0.7rem; font-weight: 600; }

        .crm-table-row { cursor: pointer; transition: all 0.2s; }
        .crm-table-row:hover { background: rgba(59, 130, 246, 0.03) !important; }
        
        .crm-action-group { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
        .modern-action-btn { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: var(--bg-surface); border: 1px solid var(--border); color: var(--text-muted); cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .modern-action-btn:hover { background: var(--primary-soft); color: var(--primary); border-color: var(--primary); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15); }
        .modern-action-btn.danger:hover { background: #fee2e2; color: #ef4444; border-color: #ef4444; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15); }
        .modern-action-btn.success:hover { background: #dcfce7; color: #10b981; border-color: #10b981; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15); }

        /* Overflow Menu Styling */
        .crm-actions-overflow { position: relative; }
        .crm-actions-overflow summary { list-style: none; outline: none; }
        .crm-actions-overflow summary::-webkit-details-marker { display: none; }
         
        .overflow-menu-content { 
          position: absolute; 
          right: 0; 
          top: calc(100% + 8px); 
          background: var(--bg-card); 
          border: 1px solid var(--border); 
          border-radius: 16px; 
          padding: 8px; 
          z-index: 1000; 
          min-width: 220px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          backdrop-filter: blur(20px);
        }
         
        .overflow-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          color: var(--text);
          font-size: 0.82rem;
          font-weight: 700;
          text-decoration: none;
          border: none;
          background: transparent;
          cursor: pointer;
          text-align: left;
          width: 100%;
          transition: all 0.2s;
          white-space: nowrap;
        }
         
        .overflow-item:hover {
          background: var(--bg-surface);
          color: var(--primary);
        }

        .overflow-item.primary {
          background: var(--primary-soft);
          color: var(--primary);
        }
         
        .overflow-item span { flex: 1; }
        .overflow-item svg { color: var(--text-dimmed); transition: color 0.2s; }
        .overflow-item:hover svg { color: var(--primary); }

        /* Glass Filter Effect */
        .modern-filter-panel { 
           background: var(--bg-card); 
           backdrop-filter: blur(10px); 
           border: 1px solid var(--border); 
           border-radius: 24px; 
           padding: 24px;
           margin-bottom: 24px;
        }

         .users-page-header { margin-bottom: 8px; }
         .users-title { font-size: 1.3rem; font-weight: 800; color: var(--text); margin-bottom: 2px; }
         .users-subtitle { font-size: 0.85rem; color: var(--text-dimmed); font-weight: 500; }

         .unified-action-bar { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 8px; flex-wrap: wrap; }
         .search-filter-group { display: flex; align-items: center; gap: 16px; flex: 1; justify-content: space-between; }
         .filter-select { max-width: 150px; }
         .btn-clear-filters { background: none; border: none; color: var(--primary); font-weight: 700; font-size: 0.8rem; cursor: pointer; }
         .btn-clear-filters:hover { text-decoration: underline; }

         .crm-stats-bar-compact { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 12px; justify-content: space-between; }
         .stat-pill-mini { --stat-accent: var(--card-accent); background: color-mix(in srgb, var(--bg-card) 88%, var(--bg-surface) 12%); border: 1px solid var(--border-strong); padding: 14px 18px; border-radius: 16px; display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 130px; box-shadow: inset 4px 0 0 var(--stat-accent), 0 10px 24px rgba(var(--text-rgb), 0.06); transition: all 0.25s ease; }
         .crm-stats-bar-compact .stat-pill-mini:nth-child(1) { --stat-accent: #3b82f6; }
         .crm-stats-bar-compact .stat-pill-mini:nth-child(2) { --stat-accent: #10b981; }
         .crm-stats-bar-compact .stat-pill-mini:nth-child(3) { --stat-accent: #f59e0b; }
         .crm-stats-bar-compact .stat-pill-mini:nth-child(4) { --stat-accent: #8b5cf6; }
         .crm-stats-bar-compact .stat-pill-mini:nth-child(5) { --stat-accent: #ef4444; }
         .crm-stats-bar-compact .stat-pill-mini:nth-child(6) { --stat-accent: #14b8a6; }
         .stat-pill-mini.clickable { cursor: pointer; }
         .stat-pill-mini:hover { transform: translateY(-2px); border-color: var(--stat-accent); box-shadow: inset 4px 0 0 var(--stat-accent), 0 14px 30px color-mix(in srgb, var(--stat-accent) 20%, rgba(var(--text-rgb), 0.08)); }
         .stat-pill-mini.is-active { background: color-mix(in srgb, var(--bg-card) 82%, var(--stat-accent) 18%); border-color: var(--stat-accent); }
         .stat-pill-label { font-size: 11px; font-weight: 800; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.08em; }
         .stat-pill-value { font-size: 20px; font-weight: 900; }
         .stat-pill-value.total { color: var(--text); }
         .stat-pill-value.active { color: var(--success); }
         .stat-pill-value.inactive { color: var(--danger); }
         .stat-pill-value.pending { color: var(--warning); }

         .crm-input { width: 100%; background: var(--bg-surface) !important; border: 1px solid var(--border-strong) !important; border-radius: 10px !important; padding: 8px 14px !important; color: var(--text) !important; font-size: 0.85rem !important; transition: all 0.2s; }

         
         .add-user-btn { background: var(--primary) !important; color: white !important; border: none !important; border-radius: 10px !important; padding: 0 20px !important; font-weight: 700 !important; height: 38px; display: flex; align-items: center; gap: 6px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.2); font-size: 0.85rem; flex-shrink: 0; }
         .add-user-btn:hover { background: var(--primary-hover) !important; transform: translateY(-2px); box-shadow: 0 6px 18px rgba(var(--primary-rgb), 0.4); }

         .crm-table th { padding: 12px 16px !important; border-bottom: 2px solid var(--border-strong) !important; }
         .crm-table td { padding: 10px 16px !important; border-bottom: 1px solid var(--border-strong) !important; }
         
         @media (max-width: 1000px) {
            .crm-stats-bar-compact { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            .stat-pill-mini { min-width: 0; padding: 10px; }
            .stat-pill-value { font-size: 1.1rem; }
            .add-user-btn { width: 100%; justify-content: center; }
         }
          .priority-badge { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; padding: 2px 8px; border-radius: 6px; }
          .priority-badge.high { background: #fee2e2; color: #ef4444; }
          .priority-badge.medium { background: #fef3c7; color: #d97706; }
          .priority-badge.low { background: #dcfce7; color: #10b981; }
          .bulk-assign-btn { background: #10b981 !important; color: white !important; border: none !important; border-radius: 10px !important; padding: 0 16px !important; font-weight: 700 !important; height: 38px; display: flex; align-items: center; gap: 8px; transition: all 0.3s; font-size: 0.85rem; flex-shrink: 0; }
          .bulk-assign-btn:hover { background: #059669 !important; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); }
          .selection-count { background: rgba(255, 255, 255, 0.2); padding: 2px 8px; border-radius: 6px; font-size: 0.75rem; margin-left: 4px; font-weight: 800; }
      `}</style>
    </div>
  )
}
