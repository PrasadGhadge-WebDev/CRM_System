import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function LandingCta({ handleDemoLogin, plain = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from

  return (
    <section className="landing-cta-section">
      <div className={`cta-content${plain ? ' cta-content-plain' : ''}`}>
        <h2 className="section-title">Ready to level up your workflow?</h2>
        <p className="cta-subtitle">
          Jump right into a fully-configured demo workspace or sign in to your real account.
        </p>
        <div className="cta-actions">
          <button
            className="pill-btn primary-pill"
            onClick={() => navigate('/login', { state: { entry: 'landing', from } })}
          >
            Login to Dashboard
          </button>
          <button
            className="pill-btn secondary-pill cta-secondary-btn"
            onClick={handleDemoLogin}
          >
            Explore Free Demo
          </button>
        </div>
      </div>
    </section>
  )
}
