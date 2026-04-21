import { useEffect, useCallback, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import Pagination from '../../../components/Pagination.jsx'
import FilterBar from '../../../components/FilterBar.jsx'
import SearchInput from '../../../components/SearchInput.jsx'
import TaskFormModal from '../../../components/TaskFormModal.jsx'
import PageHeader from '../../../components/PageHeader.jsx'
import { Icon } from '../../../layouts/icons.jsx'
import { activitiesApi } from '../../../services/activities'
import { confirmToast } from '../../../utils/confirmToast.jsx'
import { useDebouncedValue } from '../../../utils/useDebouncedValue.js'
import { useAuth } from '../../../context/AuthContext'

function stopRowNavigation(event) {
  event.stopPropagation()
}

export default function TasksList() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)

  // Filter & Sort State
  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    status: searchParams.get('status') || '',
    activity_type: searchParams.get('activity_type') || 'task',
    urgency: searchParams.get('urgency') || '',
    sortField: searchParams.get('sortField') || 'activity_date',
    sortOrder: searchParams.get('sortOrder') || 'desc',
    page: Math.max(1, Number(searchParams.get('page')) || 1),
    limit: Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20)),
  })

  const debouncedQ = useDebouncedValue(filters.q, 300)

  useEffect(() => {
    const next = new URLSearchParams()
    if (debouncedQ.trim()) next.set('q', debouncedQ.trim())
    if (filters.status) next.set('status', filters.status)
    if (filters.activity_type) next.set('activity_type', filters.activity_type)
    if (filters.urgency) next.set('urgency', filters.urgency)
    if (filters.sortField !== 'activity_date') next.set('sortField', filters.sortField)
    if (filters.sortOrder !== 'desc') next.set('sortOrder', filters.sortOrder)
    if (filters.page > 1) next.set('page', String(filters.page))
    if (filters.limit !== 20) next.set('limit', String(filters.limit))
    
    setSearchParams(next, { replace: true })
  }, [debouncedQ, filters, setSearchParams])

  const loadTasks = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await activitiesApi.list({
        ...filters,
        q: debouncedQ,
        all: user?.role === 'Admin' ? true : undefined
      })
      setItems(res.items || [])
      setTotal(res.total || 0)
    } catch (err) {
      setError('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [debouncedQ, filters])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  useEffect(() => {
    // Handle deep-linked task assignment
    const openModalParam = searchParams.get('openModal') === 'true'
    const targetAssignee = searchParams.get('assignedTo')
    
    if (openModalParam && !isModalOpen) {
      if (targetAssignee) {
        setSelectedTask({ assigned_to: targetAssignee })
      }
      setIsModalOpen(true)
      // Clear params to avoid loop on refresh
      const next = new URLSearchParams(searchParams)
      next.delete('openModal')
      next.delete('assignedTo')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, isModalOpen, setSearchParams])

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }))
  }

  const openModal = (task = null) => {
    setSelectedTask(task)
    setIsModalOpen(true)
  }

  async function handleStatusToggle(item) {
    const newStatus = item.status === 'completed' ? 'planned' : 'completed'
    try {
      await activitiesApi.update(item.id, { status: newStatus })
      toast.success(`Task marked as ${newStatus}`)
      loadTasks()
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  async function onDelete(id) {
    const confirmed = await confirmToast('Are you sure you want to move this task to trash?', {
      confirmLabel: 'Move to Trash',
      type: 'danger',
    })
    if (!confirmed) return
    try {
      await activitiesApi.remove(id)
      toast.success('Task moved to trash')
    loadTasks()
    } catch (err) {
      toast.error('Delete failed')
    }
  }

  return (
    <div className="stack">
      <PageHeader
        title="Tasks"
        backTo="/"
        actions={<button className="btn primary" onClick={() => openModal()}>Add Task</button>}
      />

      <div className="card noPadding stack">
        <div className="padding border-bottom row gap10">
          <button 
            className={`btn small ${!filters.urgency ? 'primary' : 'ghost'}`}
            onClick={() => handleFilterChange({ urgency: '' })}
          >
            All Tasks
          </button>
          <button 
            className={`btn small ${filters.urgency === 'overdue' ? 'danger' : 'ghost red-text'}`}
            onClick={() => handleFilterChange({ urgency: 'overdue' })}
          >
            Overdue
          </button>
          <button 
            className={`btn small ${filters.urgency === 'today' ? 'info' : 'ghost blue-text'}`}
            onClick={() => handleFilterChange({ urgency: 'today' })}
          >
            Today
          </button>
        </div>
        <div className="padding">
          <SearchInput
            placeholder="Search tasks..."
            value={filters.q}
            onChange={(e) => handleFilterChange({ q: e.target.value })}
          />
        </div>

        <FilterBar 
          filters={filters}
          onFilterChange={handleFilterChange}
          resetSort={{ field: 'activity_date', order: 'desc' }}
          sortFields={[
            { key: 'description', label: 'Name' },
            { key: 'activity_date', label: 'Date' }
          ]}
          currentSort={{ field: filters.sortField, order: filters.sortOrder }}
          options={{
            status: [
              { value: 'planned', label: 'Planned' },
              { value: 'completed', label: 'Completed' }
            ],
            activity_type: [
              { value: 'task', label: 'Task' },
              { value: 'call', label: 'Call' },
              { value: 'meeting', label: 'Meeting' },
              { value: 'email', label: 'Email' }
            ]
          }}
        />
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Description</th>
              <th>Related To</th>
              <th>Due Date</th>
              <th>Status</th>
              <th className="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr 
                key={item.id}
                className="tableRowLink"
                onClick={() => openModal(item)}
              >
                <td>
                  <span className={`badge ${item.activity_type}`}>
                    {item.activity_type}
                  </span>
                </td>
                <td>{item.description || '-'}</td>
                <td>
                  {item.related_to ? (
                    <Link 
                      to={`/${item.related_type?.toLowerCase()}s/${item.related_to.id || item.related_to}`}
                      onClick={stopRowNavigation}
                    >
                      <span className="muted small">{item.related_type}:</span> {item.related_to.name || item.related_to.title || item.related_to.company || 'View'}
                    </Link>
                  ) : '-'}
                </td>
                <td>
                  <div className="stack tiny-gap">
                    <div className="small">{new Date(item.activity_date).toLocaleDateString()}</div>
                    {item.status === 'planned' && item.due_date && (
                      new Date(new Date(item.due_date).setHours(0,0,0,0)) < new Date().setHours(0,0,0,0) ? (
                        <span className="badge danger small">Overdue</span>
                      ) : new Date(item.due_date).toDateString() === new Date().toDateString() ? (
                        <span className="badge info small">Today</span>
                      ) : null
                    )}
                  </div>
                </td>
                <td>
                  <span className={`badge ${item.status === 'completed' ? 'success' : 'warning'}`}>
                    {item.status}
                  </span>
                </td>
                <td className="right">
                  <div className="tableActions">
                    <button 
                      className="iconBtn" 
                      onClick={(e) => {
                        stopRowNavigation(e)
                        openModal(item)
                      }} 
                      title="Edit"
                    >
                      <Icon name="edit" />
                    </button>
                    <button 
                      className={`iconBtn ${item.status === 'completed' ? '' : 'text-primary'}`} 
                      onClick={(e) => {
                        stopRowNavigation(e)
                        handleStatusToggle(item)
                      }}
                      title={item.status === 'completed' ? 'Undo' : 'Complete'}
                    >
                      <Icon name={item.status === 'completed' ? 'undo' : 'check'} />
                    </button>
                    <button 
                      className="iconBtn text-danger" 
                      onClick={(e) => {
                        stopRowNavigation(e)
                        onDelete(item.id)
                      }} 
                      title="Delete"
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!items.length && !loading && (
              <tr><td colSpan="5" className="center muted padding30">No tasks found.</td></tr>
            )}
            {loading && (
              <tr><td colSpan="5" className="center muted padding30">Loading tasks...</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination 
        page={filters.page} 
        limit={filters.limit} 
        total={total} 
        onPageChange={(p) => setFilters(prev => ({ ...prev, page: p }))} 
        onLimitChange={(l) => setFilters(prev => ({ ...prev, limit: l, page: 1 }))}
      />

      <TaskFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={loadTasks} 
        task={selectedTask} 
      />
    </div>
  )
}
