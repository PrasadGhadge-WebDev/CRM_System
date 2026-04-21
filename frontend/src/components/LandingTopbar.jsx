import React, { useState, useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { FiMenu, FiX, FiMapPin, FiMail, FiPhone, FiHome, FiStar, FiInfo, FiLogIn, FiArrowRight, FiSun, FiMoon } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'

const LandingTopbar = ({ handleDemoLogin, from }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

  useEffect(() => {
    document.body.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <>
      {/* Top Contact Bar */}
      <div className="landing-top-contact-bar hide-mobile">
        <div className="landing-nav-container">
          <div className="top-contact-left">
            <a href="https://maps.google.com/?q=18.1675" target="_blank" rel="noreferrer" className="contact-link">
              <FiMapPin className="icon-info" /> <span>Baramati, MH</span>
            </a>
            <a href="mailto:divinetechnologies8@gmail.com" className="contact-link">
              <FiMail className="icon-primary" /> <span>divinetechnologies8@gmail.com</span>
            </a>
          </div>
          <div className="top-contact-right">
            <a href="tel:+917387275947" className="contact-link">
              <FiPhone className="icon-success" /> <span>Call Us</span>
            </a>
            <a href="https://wa.me/917387275947" target="_blank" rel="noreferrer" className="contact-link whatsapp-link-top">
              <FaWhatsapp className="icon-whatsapp" /> <span>WhatsApp</span>
            </a>
            <Link to="/login" state={{ entry: 'landing', from }} className="topbar-login-link">
              <FiLogIn /> Login
            </Link>
          </div>
        </div>
      </div>

      <nav className="landing-navbar">
        <div className="landing-nav-container">
          <Link to="/" className="landing-logo">
            <img src="/CRM_Logo.png" alt="CRM Logo" className="landing-logo-img" />
            <span>CRM System</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="landing-nav-links">
            <NavLink to="/" end className="landing-nav-link"><FiHome className="icon-info" /> Home</NavLink>
            <NavLink to="/features" className="landing-nav-link"><FiStar className="icon-warning" /> Features</NavLink>
            <NavLink to="/about" className="landing-nav-link"><FiInfo className="icon-success" /> About</NavLink>
            <NavLink to="/contact" className="landing-nav-link"><FiMail className="icon-danger" /> Contact</NavLink>
            <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle Theme">
              {theme === 'dark' ? <FiSun className="icon-warning" size={20} /> : <FiMoon className="icon-info" size={20} />}
            </button>
            <button className="btn-primary-landing" onClick={handleDemoLogin}>
              Free Demo <FiArrowRight />
            </button>
          </div>

          {/* Mobile Toggle & Theme */}
          <div className="landing-mobile-controls">
            <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle Theme">
              {theme === 'dark' ? <FiSun className="icon-warning" size={20} /> : <FiMoon className="icon-info" size={20} />}
            </button>
            <div className="landing-mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="landing-mobile-menu">
              <NavLink to="/" end className="landing-nav-link" onClick={() => setMobileMenuOpen(false)}><FiHome className="icon-info" /> Home</NavLink>
              <NavLink to="/features" className="landing-nav-link" onClick={() => setMobileMenuOpen(false)}><FiStar className="icon-warning" /> Features</NavLink>
              <NavLink to="/about" className="landing-nav-link" onClick={() => setMobileMenuOpen(false)}><FiInfo className="icon-success" /> About</NavLink>
              <NavLink to="/contact" className="landing-nav-link" onClick={() => setMobileMenuOpen(false)}><FiMail className="icon-danger" /> Contact</NavLink>

              <div className="mobile-contact-info">
                <a href="mailto:divinetechnologies8@gmail.com" className="mobile-contact-link"><FiMail className="icon-danger" /> divinetechnologies8@gmail.com</a>
                <a href="tel:+917387275947" className="mobile-contact-link"><FiPhone className="icon-success" /> Text call</a>
                <a href="https://wa.me/917387275947" target="_blank" rel="noreferrer" className="mobile-contact-link"><FaWhatsapp className="icon-whatsapp" /> WhatsApp</a>
              </div>

              <Link to="/login" state={{ entry: 'landing', from }} className="landing-nav-link" onClick={() => setMobileMenuOpen(false)}><FiLogIn className="icon-primary" /> Login</Link>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                <button className="btn-primary-landing" onClick={() => { setMobileMenuOpen(false); handleDemoLogin(); }}>
                  Free Demo <FiArrowRight />
                </button>
                <a href="mailto:divinetechnologies8@gmail.com" className="btn-primary-landing cta-secondary-btn" onClick={() => setMobileMenuOpen(false)}>
                  Book a Strategy Call
                </a>
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  )
}

export default LandingTopbar
