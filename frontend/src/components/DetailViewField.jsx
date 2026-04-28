export default function DetailViewField({ label, value, children, highlight = false, fullWidth = false }) {
  const content = children ?? value
  return (
    <div className={`crm-intel-field ${fullWidth ? 'full-width' : ''}`.trim()}>
      <label>{label}</label>
      <div className={`crm-intel-value ${highlight ? 'highlight' : ''}`.trim()}>{content}</div>
    </div>
  )
}

