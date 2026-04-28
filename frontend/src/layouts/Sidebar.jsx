import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Icon } from './icons.jsx'
import { useAuth } from '../context/AuthContext'
import { hasPermission } from '../utils/accessControl'

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  function go(to) {
    navigate(to)
  }

  function handleNavClick() {
    if (window.innerWidth <= 900) {
      onClose()
    }
  }

  return (
    <aside className={`crmSidebar ${!isOpen ? 'collapsed' : ''}`} aria-label="Sidebar">
      <div className="sidebarTop">
        <div
          className="brandRow"
          role="button"
          tabIndex={0}
          onClick={() => go('/')}
          onKeyDown={(e) => e.key === 'Enter' && go('/')}
          title="Dashboard"
        >
          <img src="/CRM_Logo.png" alt="CRM Logo" className="brandMark" style={{ objectFit: 'contain' }} />
          <div className="brandText">
            <div className="brandName">CRM SYSTEM</div>
            <div className="brandSub muted">CRM Module</div>
          </div>
        </div>
      </div>

      <div className="sidebarNav">
        <NavLink className="navItem" to="/" end onClick={handleNavClick} title="Dashboard">
          <span className="navIcon">
            <Icon name="dashboard" />
          </span>
          <span className="navText">Dashboard</span>
        </NavLink>

        {hasPermission(user, 'users') && (
          <NavLink className="navItem" to="/users" onClick={handleNavClick} title="Users">
            <span className="navIcon">
              <Icon name="user" size={20} />
            </span>
            <span className="navText">Users</span>
          </NavLink>
        )}

        {hasPermission(user, 'leads') && (
          <NavLink className="navItem" to="/leads" onClick={handleNavClick} title="Leads">
            <span className="navIcon">
              <Icon name="shoppingCart" size={20} />
            </span>
            <span className="navText">Leads</span>
          </NavLink>
        )}

        {hasPermission(user, 'customers') && (
          <NavLink className="navItem" to="/customers" onClick={handleNavClick} title="Customers">
            <span className="navIcon">
              <Icon name="users" size={20} />
            </span>
            <span className="navText">Customers</span>
          </NavLink>
        )}

        {hasPermission(user, 'deals') && (
          <NavLink className="navItem" to="/deals" onClick={handleNavClick} title="Deals">
            <span className="navIcon">
              <Icon name="deals" size={20} />
            </span>
            <span className="navText">Deals</span>
          </NavLink>
        )}

        {hasPermission(user, 'payments') && (
          <NavLink className="navItem" to="/payments" onClick={handleNavClick} title="Payments">
            <span className="navIcon">
              <Icon name="activity" size={20} />
            </span>
            <span className="navText">Payments</span>
          </NavLink>
        )}

        {hasPermission(user, 'invoices') && (
          <NavLink className="navItem" to="/invoices" onClick={handleNavClick} title="Invoices">
            <span className="navIcon">
              <Icon name="billing" size={20} />
            </span>
            <span className="navText">Invoices</span>
          </NavLink>
        )}

        {hasPermission(user, 'reports') && (
          <NavLink className="navItem" to="/reports" onClick={handleNavClick} title="Reports">
            <span className="navIcon">
              <Icon name="reports" size={20} />
            </span>
            <span className="navText">Reports</span>
          </NavLink>
        )}
        
        {hasPermission(user, 'attendance') && (
          <NavLink className="navItem" to="/attendance" onClick={handleNavClick} title="Attendance / Leave">
            <span className="navIcon">
              <Icon name="calendar" size={20} />
            </span>
            <span className="navText">Attendance / Leave</span>
          </NavLink>
        )}

        {hasPermission(user, 'notifications') && (
          <NavLink className="navItem" to="/notifications" onClick={handleNavClick} title="Notifications">
            <span className="navIcon">
              <Icon name="bell" size={20} />
            </span>
            <span className="navText">Notifications</span>
          </NavLink>
        )}

        {hasPermission(user, 'settings') && (
          <NavLink className="navItem" to="/settings" onClick={handleNavClick} title="Settings">
            <span className="navIcon">
              <Icon name="settings" size={20} />
            </span>
            <span className="navText">Settings</span>
          </NavLink>
        )}

        {hasPermission(user, 'trash') && (
          <NavLink className="navItem" to="/trash" onClick={handleNavClick} title="Trash">
            <span className="navIcon">
              <Icon name="trash" size={20} />
            </span>
            <span className="navText">Trash</span>
          </NavLink>
        )}
      </div>

      <div className="sidebarBottom">
        <div className="userCard">
          <div className="avatar">{user?.name?.charAt(0) || 'U'}</div>
          <div className="userMeta">
            <div className="userName">{user?.name || 'User'}</div>
            <div className="userRole muted">{user?.role || 'Guest'}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
