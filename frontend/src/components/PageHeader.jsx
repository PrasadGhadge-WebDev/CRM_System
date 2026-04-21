import { useNavigate } from 'react-router-dom'
import { Icon } from '../layouts/icons.jsx'

export default function PageHeader({
  title,
  description,
  backTo = '/',
  backLabel = 'Back',
  actions,
  showBackIcon = true,
}) {
  const navigate = useNavigate()

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate(backTo)
  }

  return (
    <div className="pageHeader" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '32px', padding: '0 5px', flexWrap: 'wrap' }}>
      
      {/* Left Column: Back Button + Title */}
      <div className="pageHeaderLeft" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <button 
          className="btn-modern-back" 
          type="button" 
          onClick={handleBack} 
        >
          {showBackIcon && <Icon name="arrowLeft" size={16} />}
          <span>{backLabel}</span>
        </button>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 style={{ 
            fontSize: '2.4rem', 
            fontWeight: 900, 
            letterSpacing: '-0.04em', 
            margin: 0,
            background: 'linear-gradient(to bottom, #ffffff 40%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))',
            lineHeight: 1.1
          }}>
            {title}
          </h1>
          {description ? <p className="muted" style={{ margin: '4px 0 0 2px', fontSize: '0.95rem', fontWeight: 500, opacity: 0.6 }}>{description}</p> : null}
        </div>
      </div>

      {actions ? <div className="pageHeaderActions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>{actions}</div> : null}

    </div>
  )
}
