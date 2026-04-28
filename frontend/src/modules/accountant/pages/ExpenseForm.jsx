import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { expensesApi } from '../../../services/expenses'
import { toast } from 'react-toastify'
import { Icon } from '../../../layouts/icons'

export default function ExpenseForm({ mode = 'create' }) {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [model, setModel] = useState({
    category: 'Rent',
    amount: '',
    tax_amount: '',
    date: new Date().toISOString().split('T')[0],
    note: ''
  })
  
  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (mode === 'edit' && id) {
      expensesApi.get(id).then(res => {
        if (res) {
          setModel({
            ...res,
            date: res.date ? res.date.split('T')[0] : ''
          })
        }
      }).catch(err => {
        toast.error('Failed to load expense')
        console.error(err)
      }).finally(() => setLoading(false))
    }
  }, [id, mode])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!model.amount || !model.category) {
      toast.error('Category and Amount are required')
      return
    }

    setSaving(true)
    try {
      if (mode === 'create') {
        await expensesApi.create(model)
        toast.success('Expense added')
      } else {
        await expensesApi.update(id, model)
        toast.success('Expense updated')
      }
      navigate('/expenses')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record expense')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 muted">Loading...</div>

  return (
    <div className="expense-form-page stack gap-24">
      <header className="page-header">
        <button className="btn small" onClick={() => navigate(-1)}>
          <Icon name="arrowLeft" size={16} /> Back
        </button>
        <h1 className="text-2xl font-bold mt-16">{mode === 'create' ? 'Add Expense' : 'Edit Expense'}</h1>
      </header>

      <form className="card stack gap-24" onSubmit={handleSubmit} style={{ maxWidth: '500px' }}>
        
        <div className="grid2">
          <div className="stack tiny-gap">
            <label>Category *</label>
            <select
              className="input"
              value={model.category}
              onChange={(e) => setModel({ ...model, category: e.target.value })}
              required
            >
               <option value="Rent">Rent</option>
               <option value="Salary">Salary</option>
               <option value="Software">Software</option>
               <option value="Marketing">Marketing</option>
               <option value="Travel">Travel</option>
               <option value="Office Supplies">Office Supplies</option>
               <option value="Utilities">Utilities</option>
               <option value="Other">Other</option>
            </select>
          </div>
          <div className="stack tiny-gap">
            <label>Date *</label>
            <input
              type="date"
              className="input"
              value={model.date}
              onChange={(e) => setModel({ ...model, date: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="grid2">
          <div className="stack tiny-gap">
            <label>Amount (₹) *</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '10px', color: '#888' }}>₹</span>
              <input
                type="number"
                className="input"
                style={{ paddingLeft: '28px' }}
                value={model.amount}
                onChange={(e) => setModel({ ...model, amount: e.target.value })}
                min="0.01"
                step="0.01"
                required
              />
            </div>
          </div>
          <div className="stack tiny-gap">
            <label>Tax Amount (₹)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '10px', color: '#888' }}>₹</span>
              <input
                type="number"
                className="input"
                style={{ paddingLeft: '28px' }}
                value={model.tax_amount}
                onChange={(e) => setModel({ ...model, tax_amount: e.target.value })}
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <div className="stack tiny-gap">
           <label>Notes</label>
          <textarea
            className="input"
            value={model.note}
            onChange={(e) => setModel({ ...model, note: e.target.value })}
            rows={3}
             placeholder="What was this for?..."
          />
        </div>

        <div className="form-actions mt-16 row justify-end gap-16">
          <button type="button" className="btn" onClick={() => navigate(-1)} disabled={saving}>Cancel</button>
          <button type="submit" className="btn primary" disabled={saving}>
             {saving ? 'Adding...' : (mode === 'create' ? 'Add Expense' : 'Save Changes')}
          </button>
        </div>
      </form>
    </div>
  )
}
