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
    <div className="pageHeader pageHeaderPremium">
      
      {/* Left Column: Back Button + Title */}
      <div className="pageHeaderLeft pageHeaderCluster">
        <button 
          className="btn-modern-back" 
          type="button" 
          onClick={handleBack} 
        >
          {showBackIcon && <Icon name="arrowLeft" size={16} />}
          <span>{backLabel}</span>
        </button>

        <div className="pageHeaderCopy">
          <h1 className="pageHeaderHeroTitle">
            {title}
          </h1>
          {description ? <p className="pageHeaderHeroDescription">{description}</p> : null}
        </div>
      </div>

      {actions ? <div className="pageHeaderActions">{actions}</div> : null}

    </div>
  )
}
