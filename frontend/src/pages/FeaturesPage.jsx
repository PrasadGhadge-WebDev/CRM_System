import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiUsers, FiTarget, FiBarChart2, FiShield, FiLayers, FiLock, FiZap
} from 'react-icons/fi'
import LandingFooter from '../components/LandingFooter'
import '../styles/landing.css'

const FeaturesPage = () => {
  const navigate = useNavigate()

  const handleDemoLogin = () => {
    navigate('/register', { state: { entry: 'demo', from: '/features' } })
  }

  return (
    <div className="landing-container">
      {/* 1. Hero Section */}
      <section className="page-banner-hero features-page-hero">
        <div className="page-banner-content">
          <span className="page-banner-kicker">Platform Capabilities</span>
          <h1 className="page-banner-title">Everything You Need to Scale Your Sales Without the Chaos.</h1>
          <p className="page-banner-text">
            Experience intelligent automation, deep pipeline analytics, and unified customer profiles all working seamlessly within a single, beautifully engineered interface.
          </p>
        </div>
      </section>

      {/* 2. Core Pillars Section */}
      <section className="landing-about-plain">
        <div className="section-header">
          <span className="feature-minititle">The Foundation</span>
          <h2 className="section-title">Built on Three Core Pillars</h2>
          <p className="text-muted" style={{ margin: '0 auto', maxWidth: '600px' }}>
            Our philosophy is simple: build software that humanizes data and automates the mundane.
          </p>
        </div>

        <div className="values-grid staggered-entry">
          <div className="value-card">
            <FiZap className="value-icon" />
            <h3>Velocity</h3>
            <p>Accelerate your sales cycle with instant lead distribution and real-time activity synchronization across your entire team.</p>
          </div>
          <div className="value-card">
            <FiLayers className="value-icon" />
            <h3>Clarity</h3>
            <p>Transform raw customer data into actionable insights with multi-dimensional dashboards designed for immediate understanding.</p>
          </div>
          <div className="value-card">
            <FiLock className="value-icon" />
            <h3>Integrity</h3>
            <p>Maintain data integrity with automated trash recovery and rigorous role-mapped access for different team functions.</p>
          </div>
        </div>
      </section>

      {/* 3. Lifecycle Section */}
      <section id="how-it-works" className="how-it-works landing-about-plain">
        <div className="section-header">
          <span className="feature-minititle">The Flow</span>
          <h2 className="section-title">End-to-End Relationship Management</h2>
        </div>
        <div className="how-it-works-grid staggered-entry">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3 className="step-title">Centralized Leads</h3>
            <p className="step-desc">Ingest leads from multiple sources with source tracking for accurate performance attribution.</p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3 className="step-title">Interactive Timelines</h3>
            <p className="step-desc">Every lead, customer, and deal has a full activity history including calls, tasks, and notes.</p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3 className="step-title">Opportunity Tracking</h3>
            <p className="step-desc">Manage the sales pipeline through stages, keeping notes and history tied to every potential deal.</p>
          </div>
          <div className="step-card">
            <div className="step-number">4</div>
            <h3 className="step-title">Support Desk</h3>
            <p className="step-desc">Resolve customer issues with priority-based ticketing integrated into your existing profiles.</p>
          </div>
          <div className="step-card">
            <div className="step-number">5</div>
            <h3 className="step-title">Attachment Control</h3>
            <p className="step-desc">Securely upload and manage documents, proposals, and contracts on any CRM entity.</p>
          </div>
          <div className="step-card">
            <div className="step-number">6</div>
            <h3 className="step-title">Smart Recovery</h3>
            <p className="step-desc">Protect your data from accidental deletion with a built-in trash system for easy record recovery.</p>
          </div>
        </div>
      </section>

      {/* 4. Role-Wise Dashboard Showcase */}
      <section className="showcase-section landing-about-plain">
        <div className="section-header">
          <span className="feature-minititle">Real Experience</span>
          <h2 className="section-title">See our CRM in Action</h2>
          <p className="text-muted" style={{ margin: '0 auto', maxWidth: '600px' }}>
            A powerful interface tailored for every role in your organization. Experience the real system.
          </p>
        </div>

        <div className="role-showcase-grid staggered-entry">
          <div className="role-card">

            <div className="role-card-header" style={{ textAlign: 'center' }}>
              <h3 className="role-card-title"><FiShield /> Admin View</h3>
              <p className="role-card-subtitle">Full system oversight and account management</p>
            </div>
            <div className="role-image-container">
              <img src="/images/role_dashboards/admin_real.png" alt="Admin Dashboard" className="role-image-real" />
            </div>
          </div>

          <div className="role-card">

            <div className="role-card-header" style={{ textAlign: 'center' }}>
              <h3 className="role-card-title"><FiTarget /> Manager View</h3>
              <p className="role-card-subtitle">Team performance & sales pipeline tracking</p>
            </div>
            <div className="role-image-container">
              <img src="/images/role_dashboards/manager_real.png" alt="Manager Dashboard" className="role-image-real" />
            </div>
          </div>

          <div className="role-card">

            <div className="role-card-header" style={{ textAlign: 'center' }}>
              <h3 className="role-card-title"><FiUsers /> Employee View</h3>
              <p className="role-card-subtitle">Daily task execution & individual lead activity</p>
            </div>
            <div className="role-image-container">
              <img src="/images/role_dashboards/employee_real.png" alt="Employee Dashboard" className="role-image-real" />
            </div>
          </div>

          <div className="role-card">

            <div className="role-card-header" style={{ textAlign: 'center' }}>
              <h3 className="role-card-title"><FiBarChart2 /> Accountant View</h3>
              <p className="role-card-subtitle">Financial summaries & revenue monitoring</p>
            </div>
            <div className="role-image-container">
              <img src="/images/role_dashboards/accountant_real.png" alt="Accountant Dashboard" className="role-image-real" />
            </div>
          </div>
        </div>
      </section>

      <section id="final-cta" className="landing-cta-section" style={{ background: 'transparent', borderTop: 'none' }}>
        <div className="cta-content">
          <h2 className="section-title" style={{ fontSize: '3rem' }}>Ready to Experience Next-Gen CRM?</h2>
          <p className="cta-subtitle">
            Empowering teams to manage their customer lifecycle with data-driven insights and a secure, reliable infrastructure.
          </p>
          <div className="cta-actions">
            <button className="btn-primary-landing" onClick={handleDemoLogin}>
              Start Free Demo Now
            </button>
            <a href="/contact" className="btn-primary-landing cta-secondary-btn">
              Contact Us
            </a>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}

export default FeaturesPage
