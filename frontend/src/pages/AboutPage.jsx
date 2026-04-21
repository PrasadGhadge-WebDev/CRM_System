import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiZap, FiLayers, FiLock, FiUsers, FiActivity, FiShield, FiCpu, FiDatabase
} from 'react-icons/fi'
import LandingFooter from '../components/LandingFooter'
import '../styles/landing.css'

export default function AboutPage() {
  const navigate = useNavigate()

  const handleDemoLogin = () => {
    navigate('/register', { state: { entry: 'demo', from: '/about' } })
  }

  return (
    <div className="landing-container">
      {/* 1. Hero Banner */}
      <section className="page-banner-hero about-page-hero">
        <div className="page-banner-content">
          <span className="page-banner-kicker">About CRM System</span>
          <h1 className="page-banner-title">A CRM Built for the Way Real Teams Work.</h1>
          <p className="page-banner-text">
            Designed and developed to give sales teams, managers, and accountants a single, unified workspace — eliminating guesswork with real-time data, role-based access, and a clean, modern interface.
          </p>
        </div>
      </section>

      {/* 2. What This CRM Is */}
      <section className="landing-about-plain">
        <div className="section-header">
          <span className="feature-minititle">The Platform</span>
          <h2 className="section-title">What CRM System Is</h2>
          <p className="text-muted" style={{ margin: '0 auto', maxWidth: '650px' }}>
            A full-stack, role-aware customer relationship management system that handles the complete customer lifecycle — from first contact to closed deal — built with React, Node.js, and MongoDB.
          </p>
        </div>

        <div className="values-grid staggered-entry">
          <div className="value-card">
            <FiUsers className="value-icon" />
            <h3>Multi-Role Workspace</h3>
            <p>Separate dashboards and permissions for Admin, Manager, Accountant, and Employee roles. Each user sees exactly what they need.</p>
          </div>
          <div className="value-card">
            <FiActivity className="value-icon" />
            <h3>Complete Activity Tracking</h3>
            <p>Log calls, meetings, emails, and tasks against any lead, customer, or deal. Every interaction is time-stamped and searchable.</p>
          </div>
          <div className="value-card">
            <FiLock className="value-icon" />
            <h3>Secure by Design</h3>
            <p>Role-based access control, login-attempt limits, session tokens, and secure password hashing with bcrypt built in from day one.</p>
          </div>
          <div className="value-card">
            <FiLayers className="value-icon" />
            <h3>Modular Architecture</h3>
            <p>Leads, Customers, Deals, Support Tickets, Orders, Products, Tasks, and Reports — all connected within one codebase.</p>
          </div>
          <div className="value-card">
            <FiZap className="value-icon" />
            <h3>Real-Time Notifications</h3>
            <p>Get instant in-app notifications for lead assignments, deal updates, support tickets, and system events as they happen.</p>
          </div>
          <div className="value-card">
            <FiShield className="value-icon" />
            <h3>Data Safety</h3>
            <p>Soft-delete with trash recovery for all critical records — leads, deals, customers — so accidental deletions are never permanent.</p>
          </div>
        </div>
      </section>


      {/* 4. Modules Included */}
      <section className="landing-about-plain">
        <div className="section-header">
          <span className="feature-minititle">What's Included</span>
          <h2 className="section-title">Every Module You Need</h2>
        </div>
        <div className="arch-feature-grid staggered-entry">
          <div className="arch-card">
            <FiUsers className="arch-icon" />
            <div className="arch-info">
              <h3>Leads & Follow-ups</h3>
              <p>Lead capture with source tracking, notes, follow-up scheduling, and full status lifecycle management.</p>
            </div>
          </div>
          <div className="arch-card">
            <FiActivity className="arch-icon" />
            <div className="arch-info">
              <h3>Deals & Pipeline</h3>
              <p>Track opportunities through deal stages with full history, notes, attachments, and analytics.</p>
            </div>
          </div>
          <div className="arch-card">
            <FiShield className="arch-icon" />
            <div className="arch-info">
              <h3>Support Ticketing</h3>
              <p>Customer support desk with priority levels (low/medium/high/urgent), category tagging, and assignment workflows.</p>
            </div>
          </div>
          <div className="arch-card">
            <FiDatabase className="arch-icon" />
            <div className="arch-info">
              <h3>Orders & Products</h3>
              <p>Manage product catalog with pricing and link orders to customers for accountant-level revenue visibility.</p>
            </div>
          </div>
          <div className="arch-card">
            <FiCpu className="arch-icon" />
            <div className="arch-info">
              <h3>Reports & Analytics</h3>
              <p>Role-filtered reports for admins and accountants with lead, deal, and revenue trend breakdowns.</p>
            </div>
          </div>
          <div className="arch-card">
            <FiLock className="arch-icon" />
            <div className="arch-info">
              <h3>User & Access Control</h3>
              <p>Invite and manage team users with per-role module access — Admin, Manager, Employee, Accountant.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CTA */}
      <section className="landing-cta-section" style={{ background: 'transparent', borderTop: 'none' }}>
        <div className="cta-content">
          <h2 className="section-title" style={{ fontSize: '2.5rem' }}>See It In Action</h2>
          <p className="cta-subtitle">Try the live demo — no sign-up required.</p>
          <div className="cta-actions">
            <button className="btn-primary-landing" onClick={handleDemoLogin}>
              Start Free Demo
            </button>
            <a href="/contact" className="btn-primary-landing cta-secondary-btn">
              Get in Touch
            </a>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
