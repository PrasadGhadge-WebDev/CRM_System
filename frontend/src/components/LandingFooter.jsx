import React from 'react'
import { Link } from 'react-router-dom'
import { FiTwitter, FiGithub, FiLinkedin, FiHome, FiInfo, FiMail, FiLogIn, FiShield, FiFile, FiLock, FiStar } from 'react-icons/fi'

const LandingFooter = () => {
  return (
    <footer className="landing-footer">
      <div className="footer-container">
        <div className="footer-grid">
          {/* Column 1: Brand */}
          <div className="footer-col brand-col">
            <div className="landing-logo footer-logo">
              <img src="/CRM_Logo.png" alt="CRM Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} /> <span>CRM System</span>
            </div>
            <p className="footer-desc">
              A unified CRM workspace for managing customers, leads, deals, tasks, follow-ups, reports, billing, and access control.
            </p>
            <div className="footer-socials">
              <a href="#" aria-label="Twitter"><FiTwitter className="icon-twitter" /></a>
              <a href="https://www.linkedin.com/company/divine-technologies-baramati/" target="_blank" rel="noreferrer" aria-label="LinkedIn">
                <FiLinkedin className="icon-linkedin" />
              </a>
              <a href="#" aria-label="GitHub"><FiGithub className="icon-github" /></a>
            </div>
          </div>

          {/* Column 2: Product */}
          <div className="footer-col">
            <h4 className="footer-heading">Product</h4>
            <ul className="footer-links">
              <li><Link to="/"><FiHome className="icon-info" /> Home</Link></li>
              <li><Link to="/features"><FiStar className="icon-warning" /> Features</Link></li>
              <li><Link to="/about"><FiInfo className="icon-success" /> About</Link></li>
              <li><Link to="/contact"><FiMail className="icon-danger" /> Contact</Link></li>
              <li><Link to="/login"><FiLogIn className="icon-primary" /> Login</Link></li>
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div className="footer-col">
            <h4 className="footer-heading">Legal</h4>
            <ul className="footer-links">
              <li><a href="#"><FiShield className="icon-success" /> Privacy Policy</a></li>
              <li><a href="#"><FiFile className="icon-info" /> Terms of Service</a></li>
              <li><a href="#"><FiInfo className="icon-warning" /> Cookie Policy</a></li>
              <li><a href="#"><FiLock className="icon-danger" /> Security</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} CRM Systems Inc. All rights reserved.</p>
          <div className="footer-bottom-links">
            <p className="footer-status flex gap-2 items-center">
              <span className="status-dot"></span> Role-based CRM workspace
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default LandingFooter
