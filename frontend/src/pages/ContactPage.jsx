import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiMail,
  FiPhone,
  FiMapPin,
  FiSend,
  FiCheckCircle,
  FiMessageSquare,
  FiClock,
  FiUser,
  FiAtSign,
  FiInfo
} from 'react-icons/fi'
import LandingFooter from '../components/LandingFooter'
import { toast } from 'react-toastify'
import axios from 'axios'
import '../styles/landing.css'

export default function ContactPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Assuming we'll have a backend endpoint /api/contact
      await axios.post('/api/contact', formData)
      setSubmitted(true)
      toast.success('Message sent successfully! We will get back to you soon.')
    } catch (err) {
      console.error('Contact error:', err)
      toast.error('Failed to send message. Please try again later.')
      // Fallback for demo if backend not ready yet
      // setSubmitted(true) 
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = () => {
    navigate('/register', { state: { entry: 'demo', from: '/contact' } })
  }

  return (
    <div className="landing-container">
      {/* 1. Hero Banner */}
      <section className="page-banner-hero contact-page-hero">
        <div className="page-banner-content">
          <span className="page-banner-kicker">Contact Us</span>
          <h1 className="page-banner-title">We'd Love to Hear From You.</h1>
          <p className="page-banner-text">
            Have questions about our CRM features, pricing, or need a custom solution? 
            Our team is here to help you optimize your business workflows.
          </p>
        </div>
      </section>

      {/* 2. Contact Section */}
      <section className="landing-contact-section">
        <div className="contact-grid-container">
          
          {/* Contact Info */}
          <div className="contact-info-panel staggered-entry">
            <div className="info-card">
              <div className="info-icon-box"><FiMail className="icon-danger" /></div>
              <div className="info-content">
                <h3>Email Us</h3>
                <p>prasadghadge748@gmail.com</p>
                <span className="info-meta">Response within 24 hours</span>
              </div>
            </div>

            <div className="info-card">
              <div className="info-icon-box"><FiPhone className="icon-success" /></div>
              <div className="info-content">
                <h3>Call Us</h3>
                <p>+91 97668 75947</p>
                <span className="info-meta">Mon-Fri, 9am - 6pm</span>
              </div>
            </div>

            <div className="info-card">
              <div className="info-icon-box"><FiMapPin className="icon-primary" /></div>
              <div className="info-content">
                <h3>Visit Us</h3>
                <p>Baramati, Maharashtra, India</p>
                <span className="info-meta">Corporate Headquarters</span>
              </div>
            </div>

            <div className="info-card">
              <div className="info-icon-box"><FiClock className="icon-warning" /></div>
              <div className="info-content">
                <h3>Working Hours</h3>
                <p>Monday - Saturday</p>
                <span className="info-meta">9:00 AM - 7:00 PM IST</span>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="contact-form-container staggered-entry">
            {submitted ? (
              <div className="contact-success-state">
                <FiCheckCircle className="success-icon" />
                <h2>Message Received!</h2>
                <p>Thank you for reaching out. One of our experts will contact you shortly at <strong>{formData.email}</strong>.</p>
                <button className="btn-primary-landing" onClick={() => setSubmitted(false)}>
                  Send Another Message
                </button>
              </div>
            ) : (
              <form className="contact-premium-form" onSubmit={handleSubmit}>
                <div className="form-header">
                  <h2>Send a Message</h2>
                  <p>Fill out the form below and we'll be in touch.</p>
                </div>

                <div className="contact-form-grid">
                  <div className="contact-input-group">
                    <label><FiUser /> Full Name</label>
                    <input 
                      type="text" 
                      name="name" 
                      placeholder="e.g. John Doe" 
                      required 
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="contact-input-group">
                    <label><FiAtSign /> Email Address</label>
                    <input 
                      type="email" 
                      name="email" 
                      placeholder="e.g. john@example.com" 
                      required 
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="contact-input-group full-width">
                    <label><FiInfo /> Subject</label>
                    <input 
                      type="text" 
                      name="subject" 
                      placeholder="How can we help?" 
                      required 
                      value={formData.subject}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="contact-input-group full-width">
                    <label><FiMessageSquare /> Your Message</label>
                    <textarea 
                      name="message" 
                      placeholder="Tell us more about your requirements..." 
                      rows="5" 
                      required
                      value={formData.message}
                      onChange={handleChange}
                    ></textarea>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn-primary-landing submit-btn" 
                  disabled={loading}
                >
                  {loading ? 'Sending...' : <>Send Message <FiSend /></>}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* 3. FAQ Preview or CTA */}
      <section className="landing-cta-section" style={{ background: 'transparent', borderTop: 'none' }}>
        <div className="cta-content">
          <h2 className="section-title" style={{ fontSize: '2.5rem' }}>Ready to Scale?</h2>
          <p className="cta-subtitle">Start managing your team and leads more effectively today.</p>
          <div className="cta-actions">
            <button className="btn-primary-landing" onClick={handleDemoLogin}>
              Launch Free Demo
            </button>
            <button className="btn-primary-landing cta-secondary-btn" onClick={() => navigate('/features')}>
              Explore Features
            </button>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
