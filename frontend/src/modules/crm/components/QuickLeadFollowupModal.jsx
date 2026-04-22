import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import Modal from '../../../components/Modal.jsx'
import { leadsApi } from '../../../services/leads.js'

function toDateInput(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().split('T')[0]
}

function tomorrowDateInput() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return toDateInput(date)
}

export default function QuickLeadFollowupModal({
  isOpen,
  onClose,
  lead,
  onSaved,
  initialLastContactDate,
}) {
  const leadId = lead?.id || lead?._id
  const today = useMemo(() => toDateInput(new Date()), [])
  const [model, setModel] = useState({
    lastContactDate: initialLastContactDate || today,
    nextFollowupDate: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen || !lead) return
    setModel({
      lastContactDate: initialLastContactDate || today,
      nextFollowupDate: toDateInput(lead.nextFollowupDate) || tomorrowDateInput(),
      notes: lead.followupNote || '',
    })
  }, [isOpen, lead, initialLastContactDate, today])

  async function handleSubmit(event) {
    event.preventDefault()
    if (!leadId) return
    if (!model.nextFollowupDate) {
      toast.error('Next follow-up date is required')
      return
    }

    setSaving(true)
    try {
      const endOfDay = new Date(`${model.nextFollowupDate}T23:59:00`)
      const payload = {
        mode: 'Call',
        status: 'planned',
        nextFollowupDate: endOfDay.toISOString(),
        note: model.notes || '',
        requestId: globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2),
      }

      const updated = await leadsApi.updateFollowup(leadId, payload)
      toast.success('Follow-up saved')
      onSaved?.(updated)
      onClose?.()
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to save follow-up'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={!!isOpen && !!lead}
      onClose={() => {
        if (saving) return
        onClose?.()
      }}
      title="Follow-up"
    >
      <form onSubmit={handleSubmit} style={{ padding: '20px 32px', display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Lead</label>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{lead?.name || '—'}</div>
        </div>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Last Contact Date</label>
            <input className="input" type="date" value={model.lastContactDate} readOnly />
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Next Follow-up</label>
            <input
              className="input"
              type="date"
              value={model.nextFollowupDate}
              min={today}
              onChange={(e) => setModel((prev) => ({ ...prev, nextFollowupDate: e.target.value }))}
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Notes</label>
          <textarea
            className="input"
            value={model.notes}
            onChange={(e) => setModel((prev) => ({ ...prev, notes: e.target.value }))}
            rows={4}
            placeholder="Add follow-up notes..."
            style={{ resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <button className="btn secondary" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
