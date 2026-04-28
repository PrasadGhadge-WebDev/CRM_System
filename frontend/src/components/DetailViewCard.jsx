import { Icon } from '../layouts/icons.jsx'

export default function DetailViewCard({ title, icon, right, children, className = '' }) {
  return (
    <section className={`crm-detail-card ${className}`.trim()}>
      <div className="crm-detail-card-header">
        <div className="crm-detail-card-title">
          {icon ? <Icon name={icon} /> : null}
          <h3>{title}</h3>
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div className="crm-detail-card-body">{children}</div>
    </section>
  )
}

