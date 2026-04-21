import React from 'react'
import { Icon } from '../../../layouts/icons'

export default function Billing() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Billing & Subscriptions</h1>
          <p className="page-subtitle muted">Manage your plans, invoices, and payment methods.</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px', padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px', color: 'var(--primary)' }}>
          <Icon name="activity" size={48} />
        </div>
        <h2>Billing Module</h2>
        <p className="muted">The billing and subscription management module is coming soon.</p>
        <div style={{ marginTop: '20px' }}>
          <button className="btn btn-primary">View Plans</button>
        </div>
      </div>
    </div>
  )
}
