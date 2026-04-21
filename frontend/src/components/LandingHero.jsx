import { FiInfo, FiArrowRight } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

const LandingHero = ({ handleDemoLogin }) => {
  const navigate = useNavigate()
  
  return (
    <section className="landing-hero-v2">
      {/* Network mesh overlay background */}
      <div className="hero-mesh-overlay"></div>
      
      <div className="hero-v2-container">
        
        {/* Left Column (Text & Actions) */}
        <div className="hero-content-left">
          <h3 className="hero-minititle">CRM SYSTEM</h3>
          <h1 className="hero-huge-title">
            THE INTELLIGENT WAY TO<br/>MANAGE YOUR CUSTOMERS
          </h1>
          <p className="hero-subtitle-text">
            "Stop losing deals. Start scaling with the world's most intuitive CRM."
          </p>
          
          <div className="hero-pill-actions">
            <button 
              className="pill-btn primary-pill"
              onClick={() => navigate('/register')}
            >
              Get Started Free <FiArrowRight />
            </button>
            <button 
              className="pill-btn secondary-pill" 
              onClick={() => navigate('/login')}
            >
              Employee Login
            </button>
          </div>
        </div>

        {/* Right Column (Image + Wave Divider) */}
        <div className="hero-image-right">
          <img 
            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
            alt="Team collaborating" 
            className="hero-office-img" 
          />
          {/* Custom SVG Wave Mask matching the image's swooping curve */}
          <svg className="hero-wave" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,0 C80,30 10,70 100,100 L0,100 Z" fill="var(--hero-bg)" />
          </svg>
        </div>
        
      </div>
    </section>
  )
}

export default LandingHero
