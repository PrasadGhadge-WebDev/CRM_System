import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../../../layouts/icons'
import { api } from '../../../services/api'
import { toast } from 'react-toastify'

const STEPS = [
  { id: 1, title: 'Personal Info', icon: 'user' },
  { id: 2, title: 'Job Details', icon: 'deals' },
  { id: 3, title: 'Salary Setup', icon: 'billing' },
  { id: 4, title: 'Login Info', icon: 'settings' },
  { id: 5, title: 'Files', icon: 'download' },
  { id: 6, title: 'Save', icon: 'check' },
]

export default function EmployeeForm() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', address: '', gender: '', date_of_birth: '',
    employee_id: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
    department: '', designation: '', role: 'Employee', joining_date: new Date().toISOString().split('T')[0],
    basic_salary: 0, allowances: 0, deductions: 0,
    username: '', password: '', status: 'active',
    documents: []
  })

  const [errors, setErrors] = useState({})

  const validateStep = () => {
    let newErrors = {}
    if (currentStep === 1) {
      if (!formData.name.trim()) newErrors.name = 'Full Name is required'
      else if (/[^a-zA-Z\s]/.test(formData.name)) newErrors.name = 'Name should only contain letters'
      
      if (!formData.email.trim()) newErrors.email = 'Email is required'
      else if (!formData.email.includes('@')) newErrors.email = 'Invalid email format (must include @)'
      
      if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'
      else if (/[^0-9]/.test(formData.phone)) newErrors.phone = 'Phone must contain only numbers'
      else if (formData.phone.length < 10) newErrors.phone = 'Phone must be at least 10 digits'
    }
    
    if (currentStep === 4) {
      if (!formData.username.trim()) newErrors.username = 'Username is required'
      if (!formData.password || formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (field, value) => {
    // Real-time cleanup for Name and Phone
    let cleanedValue = value
    if (field === 'name') cleanedValue = value.replace(/[^a-zA-Z\s]/g, '')
    if (field === 'phone') cleanedValue = value.replace(/[^0-9]/g, '').slice(0, 10)

    setFormData(p => ({ ...p, [field]: cleanedValue }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handleNext = () => {
    if (validateStep()) setCurrentStep(p => Math.min(p + 1, STEPS.length))
  }
  const handleBack = () => setCurrentStep(p => Math.max(p - 1, 1))

  const handleSubmit = async () => {
    if (!validateStep()) return
    try {
      await api.post('/api/users', formData)
      toast.success('Employee onboarded successfully')
      navigate('/hr/employees')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Onboarding failed')
    }
  }

  return (
    <div className="stack leadsListPage crmContent">
      <section className="leadsFullscreenShell">
        <header className="leadsHeader">
          <div>
            <h1 className="leadsTitle">Add New Employee</h1>
            <p className="leadsDescription">Fill in the details to add a new team member.</p>
          </div>
          <div className="leadsHeaderActions">
             <button className="btn-link" onClick={() => navigate('/hr/employees')}>Cancel</button>
          </div>
        </header>

        <div className="onboarding-stepper glass-panel">
           {STEPS.map(step => (
             <div key={step.id} className={`step-pill ${currentStep === step.id ? 'active' : currentStep > step.id ? 'completed' : ''}`}>
                <div className="step-icon"><Icon name={step.icon} size={14} /></div>
                <span className="step-label">{step.title}</span>
                {step.id < STEPS.length && <div className="step-connector" />}
             </div>
           ))}
        </div>

        <div className="onboarding-content-shell glass-panel">
          {currentStep === 1 && (
            <div className="onboarding-step-view">
               <h3>Step 1: Personal Profile</h3>
               <div className="grid-2 gap-24">
                  <div className="crm-form-group">
                     <label>Full Name</label>
                     <input className={`crm-input ${errors.name ? 'error' : ''}`} placeholder="e.g. Rahul Sharma" value={formData.name} onChange={e => handleChange('name', e.target.value)} />
                     {errors.name && <span className="field-error">{errors.name}</span>}
                  </div>
                  <div className="crm-form-group">
                     <label>Email Address</label>
                     <input className={`crm-input ${errors.email ? 'error' : ''}`} placeholder="rahul@company.com" value={formData.email} onChange={e => { handleChange('email', e.target.value); if(!formData.username) handleChange('username', e.target.value); }} />
                     {errors.email && <span className="field-error">{errors.email}</span>}
                  </div>
                  <div className="crm-form-group">
                     <label>Phone Number</label>
                     <input className={`crm-input ${errors.phone ? 'error' : ''}`} placeholder="10 Digit Number" value={formData.phone} onChange={e => handleChange('phone', e.target.value)} />
                     {errors.phone && <span className="field-error">{errors.phone}</span>}
                  </div>
                  <div className="crm-form-group">
                     <label>Gender</label>
                     <select className="crm-input" value={formData.gender} onChange={e => handleChange('gender', e.target.value)}>
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                     </select>
                  </div>
                  <div className="crm-form-group">
                     <label>Date of Birth</label>
                     <input type="date" className="crm-input" value={formData.date_of_birth} onChange={e => handleChange('date_of_birth', e.target.value)} />
                  </div>
                  <div className="crm-form-group">
                     <label>Permanent Address</label>
                     <textarea className="crm-input" style={{ height: '44px' }} placeholder="Residential details" value={formData.address} onChange={e => handleChange('address', e.target.value)} />
                  </div>
               </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="onboarding-step-view">
               <h3>Step 2: Job Details</h3>
               <div className="grid-2 gap-24">
                  <div className="crm-form-group">
                     <label>Employee ID</label>
                     <input className="crm-input" value={formData.employee_id} readOnly style={{ background: 'var(--bg-surface)' }} />
                  </div>
                  <div className="crm-form-group">
                     <label>Department</label>
                     <select className="crm-input" value={formData.department} onChange={e => handleChange('department', e.target.value)}>
                        <option value="">Select Department</option>
                        <option value="IT">IT & Tech</option>
                        <option value="Sales">Sales & Marketing</option>
                        <option value="HR">Human Resources</option>
                        <option value="Finance">Finance & Accounts</option>
                        <option value="Support">Operations</option>
                     </select>
                  </div>
                  <div className="crm-form-group">
                     <label>Designation</label>
                     <input className="crm-input" placeholder="e.g. Senior Software Engineer" value={formData.designation} onChange={e => handleChange('designation', e.target.value)} />
                  </div>
                  <div className="crm-form-group">
                     <label>Role Access</label>
                     <select className="crm-input" value={formData.role} onChange={e => handleChange('role', e.target.value)}>
                        <option value="Employee">Employee</option>
                        <option value="Manager">Manager</option>
                        <option value="Accountant">Accountant</option>
                        <option value="HR">HR</option>
                     </select>
                  </div>
                  <div className="crm-form-group">
                     <label>Joining Date</label>
                     <input type="date" className="crm-input" value={formData.joining_date} onChange={e => handleChange('joining_date', e.target.value)} />
                  </div>
               </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="onboarding-step-view">
               <h3>Step 3: Salary & Compensation Setup</h3>
               <div className="grid-2 gap-24">
                  <div className="crm-form-group">
                     <label>Basic Monthly Salary</label>
                     <input type="number" className="crm-input" value={formData.basic_salary} onChange={e => handleChange('basic_salary', Number(e.target.value))} />
                  </div>
                  <div className="crm-form-group">
                     <label>Allowances</label>
                     <input type="number" className="crm-input" value={formData.allowances} onChange={e => handleChange('allowances', Number(e.target.value))} />
                  </div>
                  <div className="crm-form-group">
                     <label>Deductions (Tax/PF)</label>
                     <input type="number" className="crm-input" value={formData.deductions} onChange={e => handleChange('deductions', Number(e.target.value))} />
                  </div>
                  <div className="crm-form-group">
                     <label>Net Payable (Estimate)</label>
                     <input type="number" className="crm-input" value={formData.basic_salary + formData.allowances - formData.deductions} readOnly style={{ background: 'var(--bg-surface)', fontWeight: 800, color: 'var(--primary)' }} />
                  </div>
               </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="onboarding-step-view">
               <h3>Step 4: Account Details</h3>
               <div className="grid-2 gap-24">
                  <div className="crm-form-group">
                     <label>Username (Login Name)</label>
                     <input className={`crm-input ${errors.username ? 'error' : ''}`} value={formData.username} onChange={e => handleChange('username', e.target.value)} />
                     {errors.username && <span className="field-error">{errors.username}</span>}
                  </div>
                  <div className="crm-form-group">
                     <label>Initial Password</label>
                     <input type="password" className={`crm-input ${errors.password ? 'error' : ''}`} placeholder="Min 6 characters" value={formData.password} onChange={e => handleChange('password', e.target.value)} />
                     {errors.password && <span className="field-error">{errors.password}</span>}
                  </div>
                  <div className="crm-form-group">
                     <label>Account Status</label>
                     <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                           <input type="radio" checked={formData.status === 'active'} onChange={() => handleChange('status', 'active')} /> Active
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                           <input type="radio" checked={formData.status === 'inactive'} onChange={() => handleChange('status', 'inactive')} /> Inactive
                        </label>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="onboarding-step-view">
               <h3>Step 5: Upload Files</h3>
               <div className="doc-upload-grid">
                  <div className="doc-upload-card">
                     <div className="doc-type">RESUME / CV</div>
                     <button className="btn-premium action-mini"><Icon name="plus" /> Select File</button>
                  </div>
                  <div className="doc-upload-card">
                     <div className="doc-type">AADHAAR / PAN</div>
                     <button className="btn-premium action-mini"><Icon name="plus" /> Select File</button>
                  </div>
                  <div className="doc-upload-card">
                     <div className="doc-type">OFFER LETTER</div>
                     <button className="btn-premium action-mini"><Icon name="plus" /> Select File</button>
                  </div>
               </div>
            </div>
          )}

          {currentStep === 6 && (
            <div className="onboarding-step-view">
               <h3>Step 6: Review</h3>
               <div className="review-box glass-panel">
                  <div className="review-item"><strong>Name:</strong> {formData.name}</div>
                  <div className="review-item"><strong>Job:</strong> {formData.designation} ({formData.department})</div>
                  <div className="review-item"><strong>Net Salary:</strong> ₹{formData.basic_salary + formData.allowances - formData.deductions}</div>
                  <div className="review-item"><strong>ID:</strong> {formData.employee_id}</div>
               </div>
               <p className="text-xs muted" style={{ marginTop: '16px' }}>By saving, you are creating an employee profile and login details.</p>
            </div>
          )}

          <div className="onboarding-footer">
             {currentStep > 1 && <button className="btn-link" onClick={handleBack}>Previous</button>}
             <div style={{ marginLeft: 'auto' }}>
                {currentStep < STEPS.length ? (
                  <button className="btn-premium action-vibrant" onClick={handleNext}>Next Step</button>
                ) : (
                  <button className="btn-premium action-vibrant" onClick={handleSubmit}>Save and Add</button>
                )}
             </div>
          </div>
        </div>
      </section>

      <style>{`
        .onboarding-stepper { display: flex; justify-content: space-between; padding: 20px 32px; margin: 24px 0; border-radius: 20px; }
        .step-pill { display: flex; align-items: center; gap: 12px; position: relative; opacity: 0.5; transition: all 0.3s ease; }
        .step-pill.active { opacity: 1; color: var(--primary); }
        .step-pill.completed { opacity: 1; color: #10b981; }
        .step-icon { width: 32px; height: 32px; border-radius: 50%; border: 2px solid currentColor; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.02); }
        .step-label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
        .step-connector { height: 2px; width: 40px; background: var(--border-subtle); margin-left: 12px; }

        .onboarding-content-shell { padding: 40px; border-radius: 24px; min-height: 400px; display: flex; flex-direction: column; }
        .onboarding-step-view h3 { font-size: 1.1rem; font-weight: 900; margin-bottom: 32px; color: var(--text); border-left: 4px solid var(--primary); padding-left: 16px; }
        .onboarding-footer { margin-top: auto; padding-top: 40px; display: flex; align-items: center; border-top: 1px solid var(--border-subtle); }

        .doc-upload-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .doc-upload-card { padding: 32px; border: 2px dashed var(--border); border-radius: 20px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; background: rgba(255,255,255,0.02); }
        .doc-type { font-size: 0.7rem; font-weight: 900; color: var(--text-dimmed); letter-spacing: 0.1em; }

        .review-box { padding: 24px; border-radius: 16px; background: rgba(255,255,255,0.02); display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .review-item { font-size: 0.9rem; color: var(--text); }
        .review-item strong { color: var(--text-dimmed); font-size: 0.75rem; display: block; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }

        .field-error { color: #ef4444; font-size: 0.65rem; font-weight: 800; margin-top: 4px; display: block; }
        .crm-input.error { border-color: #ef4444; background: rgba(239, 68, 68, 0.05); }
      `}</style>
    </div>
  )
}
