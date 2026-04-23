import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  FiUsers,
  FiTarget,
  FiBarChart2,
  FiShield,
  FiCheckCircle,
  FiChevronRight,
  FiFolder,
  FiClipboard,
  FiTrendingUp,
  FiClock,
  FiFileText,
  FiDollarSign,
  FiSettings,
  FiTrash2,
  FiUserCheck,
} from 'react-icons/fi'
import LandingHero from '../components/LandingHero'
import LandingFooter from '../components/LandingFooter'
import LandingCta from '../components/LandingCta'

import '../styles/landing.css'

const LandingPage = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const handleDemoLogin = () => {
    navigate('/register', {
      state: { entry: 'demo', from: location.state?.from },
    })
  }

  return (
    <div className="landing-container">
      <LandingHero handleDemoLogin={handleDemoLogin} />

      <section className="landing-demo-register">
        <div className="landing-demo-register-inner">
          <div className="landing-demo-register-copy">
            <span className="feature-minititle">Live Demo Access</span>
            <h2 className="section-title">Start Demo</h2>
            <p className="text-muted">
              Open the live demo in one click.
            </p>
          </div>
          <div className="landing-demo-register-action">
            <button className="btn-primary-landing" type="button" onClick={handleDemoLogin}>
              Demo
            </button>
          </div>
        </div>
      </section>

      {/* <section id="stats" className="landing-stats">
        <div className="stats-container">
          <div className="stat-item">
            <div className="stat-value">10k+</div>
            <div className="stat-label">Active Users</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">99.9%</div>
            <div className="stat-label">Uptime SLA</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">4.9/5</div>
            <div className="stat-label">User Rating</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">25M+</div>
            <div className="stat-label">Leads Managed</div>
          </div>
        </div>
      </section> */}

      <section id="features" className="landing-features">
        <div className="section-header">
          <span className="feature-minititle">Our Capabilities</span>
          <h2 className="section-title">Everything you need to grow</h2>
          <p className="hero-subtitle text-muted" style={{ margin: '0 auto', maxWidth: '700px' }}>
            Practical tools for managing customers, leads, deals, tasks, and the daily work your team already does.
          </p>
        </div>

        <div className="features-grid staggered-entry">
          <div className="feature-card">
            <div className="feature-icon"><FiUsers /></div>
            <h3 className="feature-name">Contact Management</h3>
            <p className="feature-desc">
              Keep customer information in one place and update records as your team works.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon"><FiTarget /></div>
            <h3 className="feature-name">Lead Tracking</h3>
            <p className="feature-desc">
              Follow leads through the CRM and keep history tied to each opportunity.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon"><FiBarChart2 /></div>
            <h3 className="feature-name">Advanced Analytics</h3>
            <p className="feature-desc">
              Review reports and deal analytics from the built-in reporting pages.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon"><FiShield /></div>
            <h3 className="feature-name">Enterprise Security</h3>
            <p className="feature-desc">
              Use role-based access for Admin, Manager, Accountant, and Employee accounts.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon"><FiCheckCircle /></div>
            <h3 className="feature-name">Task Automation</h3>
            <p className="feature-desc">
              Organize work with tasks and follow-ups so day-to-day actions stay visible.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon"><FiChevronRight /></div>
            <h3 className="feature-name">Seamless Integration</h3>
            <p className="feature-desc">
              Use the CRM modules already connected through the app's navigation and routes.
            </p>
          </div>
        </div>
      </section>

      <section className="landing-about-plain">
        <div className="section-header">
          <span className="feature-minititle">Built In</span>
          <h2 className="section-title">Modules already included in this CRM</h2>
          <p className="text-muted" style={{ margin: '0 auto', maxWidth: '720px' }}>
            This homepage reflects the app structure already in the codebase: customers, leads, deals,
            tasks, follow-ups, reports, billing, users, trash, profile, and settings.
          </p>
        </div>

        <div className="values-grid staggered-entry">
          <div className="value-card">
            <FiUsers className="value-icon" />
            <h3>Customers</h3>
            <p>Add, view, and update customer records from the main CRM modules.</p>
          </div>
          <div className="value-card">
            <FiTarget className="value-icon" />
            <h3>Leads and Notes</h3>
            <p>Track lead details, manage lead history, and keep follow-up notes attached to each record.</p>
          </div>
          <div className="value-card">
            <FiFolder className="value-icon" />
            <h3>Deals and Pipeline</h3>
            <p>Work with deal records and move opportunities through the sales pipeline.</p>
          </div>
          <div className="value-card">
            <FiClipboard className="value-icon" />
            <h3>Tasks and Follow-ups</h3>
            <p>Keep daily work organized with task tracking and follow-up workflows.</p>
          </div>
          <div className="value-card">
            <FiBarChart2 className="value-icon" />
            <h3>Reports and Analytics</h3>
            <p>Review reports and deal analytics from the app's reporting pages.</p>
          </div>
          <div className="value-card">
            <FiDollarSign className="value-icon" />
            <h3>Billing and Settings</h3>
            <p>Use the billing area, admin user management, and app settings where your role allows it.</p>
          </div>
          <div className="value-card">
            <FiTrash2 className="value-icon" />
            <h3>Trash and Recovery</h3>
            <p>Review deleted items from the trash section when you need to recover records.</p>
          </div>
        </div>
      </section>

      <section className="landing-about-plain access-model-panel">
        <div className="section-header">
          <span className="feature-minititle">Access Model</span>
          <h2 className="section-title">Role-based access built into the app</h2>
          <p className="text-muted" style={{ margin: '0 auto', maxWidth: '720px' }}>
            The app already uses role groups for Admin, Manager, Accountant, and Employee access.
          </p>
        </div>

        <div className="values-grid staggered-entry">
          <div className="value-card">
            <FiSettings className="value-icon" />
            <h3>Admin</h3>
            <p>Has access to users, settings, reports, tasks, billing, and the full management surface of the app.</p>
          </div>
          <div className="value-card">
            <FiTrendingUp className="value-icon" />
            <h3>Manager</h3>
            <p>Can work with reports, tasks, and the main CRM modules used by the team.</p>
          </div>
          <div className="value-card">
            <FiUserCheck className="value-icon" />
            <h3>Employee</h3>
            <p>Works with leads, customers, follow-ups, and profile access.</p>
          </div>
          <div className="value-card">
            <FiClock className="value-icon" />
            <h3>Accountant</h3>
            <p>Can access billing and the shared CRM modules allowed for authenticated users.</p>
          </div>
          <div className="value-card">
            <FiFileText className="value-icon" />
            <h3>Profiles</h3>
            <p>Every authenticated user can reach profile-related pages from the navigation.</p>
          </div>
          <div className="value-card">
            <FiShield className="value-icon" />
            <h3>Controlled Navigation</h3>
            <p>Menu access is defined in the app's role map, so links stay aligned with user permissions.</p>
          </div>
        </div>
      </section>

      <LandingCta handleDemoLogin={handleDemoLogin} plain />

      <LandingFooter />
    </div>
  )
}

export default LandingPage
