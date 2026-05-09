import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import Pagination from '../../../components/Pagination.jsx'
import ModernSearchBar from '../../../components/ModernSearchBar.jsx'
import { Icon } from '../../../layouts/icons.jsx'
import { useAuth } from '../../../context/AuthContext'
import { expensesApi } from '../../../services/expenses'
import { formatCurrency } from '../../../utils/formatters'
import { useDebouncedValue } from '../../../utils/useDebouncedValue.js'
import SearchableSelect from '../../crm/components/SearchableSelect.jsx'
import ExpenseForm from './ExpenseForm.jsx'
import '../../../styles/leadsList.css'

const CATEGORY_OPTIONS = [
  { value: '', label: 'Category: All' },
  { value: 'Rent', label: 'Rent' },
  { value: 'Salary', label: 'Salary' },
  { value: 'Internet', label: 'Internet' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Travel', label: 'Travel' },
  { value: 'Medical', label: 'Medical' },
  { value: 'Training', label: 'Training' },
  { value: 'Software', label: 'Software' },
  { value: 'Other', label: 'Other' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Status: All' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Failed', label: 'Failed' },
]

const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'Date: All' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Custom Range' },
]

function stopRowNavigation(event) {
  event.stopPropagation()
}

function buildDateRange(rangeType, startDate, endDate) {
  let nextStart = startDate
  let nextEnd = endDate
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  if (rangeType === 'today') {
    nextStart = now.toISOString()
    nextEnd = new Date(new Date().setHours(23, 59, 59, 999)).toISOString()
  } else if (rangeType === 'yesterday') {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    nextStart = yesterday.toISOString()
    const yesterdayEnd = new Date(yesterday)
    yesterdayEnd.setHours(23, 59, 59, 999)
    nextEnd = yesterdayEnd.toISOString()
  } else if (rangeType === 'week') {
    const week = new Date(now)
    week.setDate(week.getDate() - 7)
    nextStart = week.toISOString()
    nextEnd = ''
  } else if (rangeType === 'month') {
    const month = new Date(now)
    month.setMonth(month.getMonth() - 1)
    nextStart = month.toISOString()
    nextEnd = ''
  } else if (rangeType !== 'custom') {
    nextStart = ''
    nextEnd = ''
  }

  return { startDate: nextStart, endDate: nextEnd }
}

export default function ExpensesList() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [category, setCategory] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [q, setQ] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dateRangeType, setDateRangeType] = useState('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [modal, setModal] = useState({ open: false, mode: 'create', id: null })
  const limit = 20
  const debouncedQ = useDebouncedValue(q, 300)

  const isAdmin = user?.role === 'Admin'
  const isAccountant = user?.role === 'Accountant'
  const isManager = user?.role === 'Manager'
  const isHR = user?.role === 'HR'
  const isEmployee = user?.role === 'Employee'

  const canApprove = (exp) => {
    if (exp.status !== 'Pending') return false
    if (isAdmin) return true // Admin can approve everything pending

    const amount = Number(exp.amount) || 0
    const cat = exp.category || ''
    
    // Employee Claims categories (Managers can approve these)
    const isClaim = ['Travel', 'Medical', 'Training', 'Wellness', 'Other', 'Food', 'Office Supplies'].includes(cat)
    
    // Large amount safety
    if (amount > 50000) return false

    // Managers/HR can approve Claims
    if (isClaim && (isManager || isHR)) return true

    return false
  }

  const canRecordPayment = (exp) => {
    return exp.status === 'Approved' && (isAccountant || isAdmin)
  }

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await expensesApi.update(id, { status: newStatus })
      toast.success(`Expense ${newStatus.toLowerCase()} successfully`)
      fetchExpenses()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
    }
  }

  const canDelete = isAdmin
  const canAdd = true

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const resolvedDates = buildDateRange(dateRangeType, startDate, endDate)
      const res = await expensesApi.list({
        category,
        status: statusFilter,
        q: debouncedQ,
        startDate: resolvedDates.startDate,
        endDate: resolvedDates.endDate,
        page,
        limit,
      })

      setExpenses(res.items || [])
      setTotal(res.total || 0)
    } catch (err) {
      setError('Failed to load expenses')
      toast.error('Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }, [category, statusFilter, debouncedQ, startDate, endDate, dateRangeType, page])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const summary = useMemo(() => {
    const totalSpent = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
    const approved = expenses.filter((item) => ['Approved', 'Completed'].includes(item.status)).length
    const pending = expenses.filter((item) => item.status === 'Pending').length

    return { totalSpent, approved, pending }
  }, [expenses])

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

  const getHeaderTitle = () => {
    if (isEmployee) return 'My Expenses'
    if (isManager) return 'My Team Expenses'
    if (isHR) return 'HR Expenses'
    return 'Expenses Management'
  }

  const getHeaderSubtitle = () => {
    if (isEmployee) return 'Track your reimbursement requests and approval status'
    return 'Monitor, categorize, and review business spending'
  }

  return (
    <div className="stack">
      <section className="crm-fullscreen-shell">
        <div className="users-page-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 className="users-title">{getHeaderTitle()}</h1>
              <p className="users-subtitle">{getHeaderSubtitle()}</p>
            </div>
            {canAdd && (
              <button
                className="btn-premium action-vibrant"
                onClick={() => setModal({ open: true, mode: 'create', id: null })}
              >
                <Icon name="plus" size={16} />
                <span>{isEmployee ? 'Request Expense' : 'Add Expense'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="crm-stats-bar-compact overflow-x-auto pb-8">
          <div
            className={`stat-pill-mini clickable ${statusFilter === '' ? 'is-active' : ''}`}
            onClick={() => {
              setStatusFilter('')
              setPage(1)
            }}
          >
            <span className="stat-pill-label">TOTAL SPENT</span>
            <span className="stat-pill-value total">{formatCurrency(summary.totalSpent)}</span>
          </div>
          <div
            className={`stat-pill-mini clickable ${statusFilter === 'Approved' ? 'is-active' : ''}`}
            onClick={() => {
              setStatusFilter('Approved')
              setPage(1)
            }}
          >
            <span className="stat-pill-label">APPROVED</span>
            <span className="stat-pill-value active">{summary.approved}</span>
          </div>
          <div
            className={`stat-pill-mini clickable ${statusFilter === 'Pending' ? 'is-active' : ''}`}
            onClick={() => {
              setStatusFilter('Pending')
              setPage(1)
            }}
          >
            <span className="stat-pill-label">PENDING</span>
            <span className="stat-pill-value pending">{summary.pending}</span>
          </div>
        </div>

        <div className="unified-action-bar">
          <div className="search-filter-group">
            <ModernSearchBar
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
              placeholder="Search by ID, title, vendor, note, category..."
            />

            <SearchableSelect
              value={category}
              onChange={(val) => {
                setCategory(val)
                setPage(1)
              }}
              options={CATEGORY_OPTIONS}
              placeholder="Category: All"
              icon="reports"
            />

            <SearchableSelect
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val)
                setPage(1)
              }}
              options={STATUS_OPTIONS}
              placeholder="Status: All"
              icon="check"
            />

            <SearchableSelect
              value={dateRangeType}
              onChange={(val) => {
                setDateRangeType(val)
                setPage(1)
              }}
              options={DATE_RANGE_OPTIONS}
              placeholder="Date: All"
              icon="calendar"
            />

            {dateRangeType === 'custom' && (
              <div className="flex items-center gap-4 animate-fade-in expense-date-range">
                <input
                  type="date"
                  className="crm-input date-mini"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    setPage(1)
                  }}
                />
                <span className="muted" style={{ fontSize: '0.7rem' }}>to</span>
                <input
                  type="date"
                  className="crm-input date-mini"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    setPage(1)
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {error ? <div className="alert error glass-alert">{error}</div> : null}

        {loading ? (
          <div className="leadsLoadingState">
            <div className="spinner-medium" />
            <span className="muted">Loading expenses...</span>
          </div>
        ) : (
          <>
            <div className="crm-table-wrap shadow-soft" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="crm-table-scroll">
                <table className="crm-table expenses-crm-table">
                  <thead style={{ background: 'var(--bg-surface)' }}>
                    <tr>
                      <th style={{ width: '100px' }}>EXP ID</th>
                      <th style={{ minWidth: '220px' }}>EXPENSE TITLE</th>
                      <th style={{ width: '130px' }}>CATEGORY</th>
                      <th style={{ width: '110px' }}>AMOUNT</th>
                      <th style={{ width: '130px' }}>DATE</th>
                      <th style={{ width: '130px' }}>PAID BY</th>
                      <th style={{ width: '120px' }}>STATUS</th>
                      <th style={{ width: '130px' }}>APPROVED BY</th>
                      <th style={{ width: '70px' }} className="text-center">DOC</th>
                      <th className="text-right" style={{ width: '90px' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.length > 0 ? (
                      expenses.map((exp) => {
                        const id = exp.id || exp._id
                        const paidBy = exp.paid_by || exp.created_by
                        const approvedBy = exp.approved_by
                        const vendorLabel = exp.vendor_name || 'Individual Expense'

                        return (
                          <tr key={String(id)} className="crm-table-row">
                            <td>
                              <span className="expense-id-badge">
                                {exp.custom_id || `#${String(id).slice(-5).toUpperCase()}`}
                              </span>
                            </td>
                            <td>
                              <div className="leadsIdentityCell">
                                <div className="leadsPrimaryText">{exp.title}</div>
                                <div className="leadsSecondaryText">{vendorLabel}</div>
                              </div>
                            </td>
                            <td>
                              <span className="expense-category-pill">{exp.category || 'Other'}</span>
                            </td>
                            <td>
                              <div className="leadsOwnerCell">
                                <span className="expense-amount">{formatCurrency(exp.amount || 0)}</span>
                                <span className="ownerRole">{exp.payment_method || 'Cash'}</span>
                              </div>
                            </td>
                            <td>
                              <div className="leadsOwnerCell">
                                <span className="ownerName">
                                  {exp.date ? new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-'}
                                </span>
                                <span className="ownerRole">{exp.date ? new Date(exp.date).getFullYear() : ''}</span>
                              </div>
                            </td>
                            <td>
                              <div className="leadsOwnerCell">
                                <span className="ownerName">{paidBy?.name || '—'}</span>
                                <span className="ownerRole">{exp.status === 'Completed' ? 'Accountant' : 'Requester'}</span>
                              </div>
                            </td>
                            <td>
                              <span className={`expense-status-badge ${(exp.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                                <span className="status-dot"></span>
                                {exp.status || 'Pending'}
                              </span>
                            </td>
                            <td>
                              <div className="leadsOwnerCell">
                                <span className="ownerName">{approvedBy?.name || '—'}</span>
                                <span className="ownerRole">{approvedBy?.role || (exp.status === 'Pending' ? 'Pending' : '—')}</span>
                              </div>
                            </td>
                            <td className="text-center">
                              {exp.receipt_url ? (
                                <a href={exp.receipt_url} target="_blank" rel="noreferrer" className="modern-action-btn" style={{ margin: '0 auto', background: 'var(--success-soft)', color: 'var(--success)' }}>
                                  <Icon name="billing" size={14} />
                                </a>
                              ) : (
                                <span className="muted" style={{ fontSize: '0.6rem' }}>NO BILL</span>
                              )}
                            </td>
                            <td className="text-right" onClick={stopRowNavigation}>
                              <div className="crm-action-group" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                                
                                {canApprove(exp) && (
                                  <>
                                    <button 
                                      className="modern-action-btn" 
                                      style={{ background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid var(--success)' }}
                                      onClick={() => handleStatusUpdate(id, 'Approved')}
                                      title="Approve"
                                    >
                                      <Icon name="check" size={14} />
                                    </button>
                                    <button 
                                      className="modern-action-btn" 
                                      style={{ background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
                                      onClick={() => handleStatusUpdate(id, 'Rejected')}
                                      title="Reject"
                                    >
                                      <Icon name="close" size={14} />
                                    </button>
                                  </>
                                )}

                                {canRecordPayment(exp) && (
                                  <button 
                                    className="modern-action-btn"
                                    style={{ background: 'var(--primary-soft)', color: 'var(--primary)', border: '1px solid var(--primary)' }}
                                    onClick={() => handleStatusUpdate(id, 'Completed')}
                                    title="Mark Paid"
                                  >
                                    <Icon name="wallet" size={14} />
                                  </button>
                                )}

                                <button
                                  className="modern-action-btn"
                                  onClick={() => setModal({ open: true, mode: 'edit', id })}
                                  title="Edit"
                                >
                                  <Icon name="edit" size={14} />
                                </button>

                                {canDelete && (
                                  <button
                                    className="modern-action-btn danger"
                                    onClick={() => handleDelete(id)}
                                    title="Delete"
                                  >
                                    <Icon name="trash" size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={8}>
                          <div className="emptyState" style={{ padding: '80px 0' }}>
                            <h3>No expenses found</h3>
                            <p className="muted">Try a different filter or add a new expense entry.</p>
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
              onPageChange={(nextPage) => setPage(Math.max(1, nextPage))}
              onLimitChange={() => {}}
            />
          </>
        )}
      </section>

      {modal.open && (
        <ExpenseForm
          mode={modal.mode}
          expenseId={modal.id}
          onClose={() => setModal({ open: false, mode: 'create', id: null })}
          onSuccess={() => {
            setModal({ open: false, mode: 'create', id: null })
            fetchExpenses()
          }}
        />
      )}

      <style>{`
        .users-page-header { margin-bottom: 8px; }
        .users-title { font-size: 1.3rem; font-weight: 800; color: var(--text); margin-bottom: 2px; }
        .users-subtitle { font-size: 0.85rem; color: var(--text-dimmed); font-weight: 500; }

        .unified-action-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }

        .search-filter-group {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
          justify-content: space-between;
          flex-wrap: wrap;
        }

        .crm-stats-bar-compact {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          margin-bottom: 12px;
          justify-content: space-between;
        }

        .stat-pill-mini {
          --stat-accent: var(--card-accent);
          background: color-mix(in srgb, var(--bg-card) 88%, var(--bg-surface) 12%);
          border: 1px solid var(--border-strong);
          padding: 14px 18px;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
          min-width: 130px;
          box-shadow: inset 4px 0 0 var(--stat-accent), 0 10px 24px rgba(var(--text-rgb), 0.06);
          transition: all 0.25s ease;
        }
        .crm-stats-bar-compact .stat-pill-mini:nth-child(1) { --stat-accent: #3b82f6; }
        .crm-stats-bar-compact .stat-pill-mini:nth-child(2) { --stat-accent: #10b981; }
        .crm-stats-bar-compact .stat-pill-mini:nth-child(3) { --stat-accent: #f59e0b; }

        .stat-pill-mini.clickable {
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .stat-pill-mini.clickable:hover {
          transform: translateY(-2px);
          border-color: var(--stat-accent);
          box-shadow: inset 4px 0 0 var(--stat-accent), 0 14px 30px color-mix(in srgb, var(--stat-accent) 20%, rgba(var(--text-rgb), 0.08));
        }
        .stat-pill-mini.is-active { background: color-mix(in srgb, var(--bg-card) 82%, var(--stat-accent) 18%); border-color: var(--stat-accent); }

        .stat-pill-label {
          font-size: 11px;
          font-weight: 800;
          color: var(--text-dimmed);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .stat-pill-value {
          font-size: 20px;
          font-weight: 900;
        }

        .stat-pill-value.total { color: var(--text); }
        .stat-pill-value.active { color: var(--success); }
        .stat-pill-value.pending { color: var(--warning); }

        .crm-table-row { transition: all 0.2s; }
        .crm-table-row:hover { background: rgba(59, 130, 246, 0.03) !important; }

        .crm-action-group {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: flex-end;
        }

        .modern-action-btn {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .modern-action-btn:hover {
          background: var(--primary-soft);
          color: var(--primary);
          border-color: var(--primary);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        }

        .modern-action-btn.success:hover {
          background: #f0fdf4;
          color: #16a34a;
          border-color: #bbf7d0;
          box-shadow: 0 4px 12px rgba(22, 163, 74, 0.15);
        }

        .modern-action-btn.danger:hover {
          background: #fee2e2;
          color: #ef4444;
          border-color: #ef4444;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
        }

        .dropdown-container-leads { position: relative; }
        .dropdown-menu-leads {
          position: absolute;
          top: 100%;
          right: 0;
          background: white;
          border: 1px solid var(--border-strong);
          border-radius: 12px;
          min-width: 200px;
          z-index: 100;
          margin-top: 8px;
          padding: 8px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }
        .dropdown-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
        }
        .dropdown-item:hover { background: var(--bg-surface); color: var(--text); }
        .dropdown-item.success { color: #16a34a; }
        .dropdown-item.success:hover { background: #f0fdf4; }
        .dropdown-item.danger { color: #ef4444; }
        .dropdown-item.danger:hover { background: #fef2f2; }
        .dropdown-divider { height: 1px; background: var(--border-subtle); margin: 6px 0; }

        .leadsIdentityCell { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .leadsPrimaryText { color: var(--text); font-size: 0.95rem; font-weight: 700; line-height: 1.4; }
        .leadsSecondaryText {
          color: var(--text-dimmed);
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          line-height: 1.35;
          word-break: break-word;
        }

        .leadsOwnerCell { display: flex; flex-direction: column; gap: 2px; }
        .ownerName { color: var(--text); font-size: 0.85rem; font-weight: 700; }
        .ownerRole {
          color: var(--text-dimmed);
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .expense-id-badge {
          display: inline-flex;
          align-items: center;
          padding: 6px 12px;
          border-radius: 10px;
          background: var(--primary-soft);
          color: var(--primary);
          font-size: 0.8rem;
          font-weight: 800;
          white-space: nowrap;
        }

        .expense-category-pill {
          display: inline-flex;
          align-items: center;
          padding: 5px 12px;
          border-radius: 999px;
          background: var(--bg-surface);
          color: var(--text-muted);
          border: 1px solid var(--border-subtle);
          font-size: 0.75rem;
          font-weight: 800;
          white-space: nowrap;
        }

        .expense-amount {
          color: var(--text);
          font-size: 0.95rem;
          font-weight: 900;
          white-space: nowrap;
        }

        .expense-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          white-space: nowrap;
          background: var(--bg-surface);
          color: var(--text-muted);
          border: 1px solid transparent;
        }

        .expense-status-badge.pending {
          background: #fffbeb;
          color: #b45309;
          border-color: #fde68a;
        }

        .expense-status-badge.approved,
        .expense-status-badge.completed {
          background: #f0fdf4;
          color: #16a34a;
          border-color: #bbf7d0;
        }

        .expense-status-badge.rejected,
        .expense-status-badge.failed {
          background: #fef2f2;
          color: #ef4444;
          border-color: #fecaca;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
          flex-shrink: 0;
        }

        .expense-date-range {
          flex-wrap: nowrap;
        }

        .crm-input {
          width: 100%;
          background: var(--bg-surface) !important;
          border: 1px solid var(--border-strong) !important;
          border-radius: 10px !important;
          padding: 8px 14px !important;
          color: var(--text) !important;
          font-size: 0.85rem !important;
          transition: all 0.2s;
        }

        .crm-table th {
          padding: 12px 16px !important;
          border-bottom: 2px solid var(--border-strong) !important;
        }

        .crm-table td {
          padding: 12px 16px !important;
          border-bottom: 1px solid var(--border-strong) !important;
          vertical-align: middle;
        }

        @media (max-width: 1000px) {
          .crm-stats-bar-compact {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }

          .stat-pill-mini {
            min-width: 0;
            padding: 10px;
          }

          .stat-pill-value {
            font-size: 1.1rem;
          }
        }

        @media (max-width: 768px) {
          .users-page-header > div {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 16px;
          }

          .search-filter-group {
            align-items: stretch;
          }

          .search-filter-group > * {
            width: 100%;
          }

          .expense-date-range {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  )
}
