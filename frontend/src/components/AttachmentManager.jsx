import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { API_BASE_URL } from '../services/api'
import { attachmentsApi } from '../services/attachments'
import { Icon } from '../layouts/icons.jsx'
import { confirmToast } from '../utils/confirmToast.jsx'
import { useToastFeedback } from '../utils/useToastFeedback.js'

export default function AttachmentManager({ relatedId, relatedType }) {
  const [attachments, setAttachments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useToastFeedback({ error })

  useEffect(() => {
    loadAttachments()
  }, [relatedId, relatedType])

  async function loadAttachments() {
    setLoading(true)
    try {
      const data = await attachmentsApi.list({ related_to: relatedId, related_type: relatedType })
      setAttachments(data)
    } catch (err) {
      setError('Failed to load attachments')
    } finally {
      setLoading(false)
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('related_to', relatedId)
      formData.append('related_type', relatedType)

      await attachmentsApi.upload(formData)
      toast.success('Attachment uploaded')
      loadAttachments()
    } catch (err) {
      setError('Upload failed. Size limit 10MB.')
    } finally {
      setUploading(false)
      e.target.value = '' // Reset input
    }
  }

  async function handleDelete(id) {
    const confirmed = await confirmToast('Delete this file?', {
      confirmLabel: 'Delete',
      type: 'danger',
    })
    if (!confirmed) return
    try {
      await attachmentsApi.remove(id)
      toast.success('Attachment deleted')
      setAttachments((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      setError('Delete failed')
    }
  }

  function formatSize(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="stack" style={{ marginTop: 24 }}>
      <div className="row">
        <h3>Attachments</h3>
        <label className="btn secondary small cursor-pointer">
          <Icon name="upload" /> Upload File
          <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
        </label>
      </div>

      {error && <div className="alert error">{error}</div>}
      {uploading && <div className="muted small">Uploading...</div>}

      <div className="card noPadding">
        {loading ? (
          <div className="padding muted">Loading...</div>
        ) : attachments.length ? (
          <div className="stack">
            {attachments.map((a) => (
              <div key={a.id} className="attachmentRow row">
                <div className="row" style={{ flex: 1 }}>
                   <Icon name="file" />
                   <div className="stack small-gap">
                      <a 
                        href={`${API_BASE_URL}/${a.path}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="link"
                      >
                        {a.original_name}
                      </a>
                      <span className="muted small">{formatSize(a.size)} &bull; {new Date(a.created_at).toLocaleDateString()}</span>
                   </div>
                </div>
                <button className="btn danger small" onClick={() => handleDelete(a.id)}>
                   <Icon name="trash" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="padding muted small center">No files attached.</div>
        )}
      </div>

      <style>{`
        .attachmentRow {
           padding: 12px 16px;
           border-bottom: 1px solid var(--border);
        }
        .attachmentRow:last-child { border-bottom: none; }
        .hidden { display: none; }
        .cursor-pointer { cursor: pointer; }
        .small-gap { gap: 4px; }
      `}</style>
    </div>
  )
}
