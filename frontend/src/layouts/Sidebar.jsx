import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { Icon } from './icons.jsx'
import { useAuth } from '../context/AuthContext'
import { hasRequiredRole, hasPermission, NAV_ACCESS, ROLE_GROUPS } from '../utils/accessControl'

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [demoCount, setDemoCount] = useState(0)

  useEffect(() => {
    if (user?.role !== 'Admin') return;

    const fetchDemoCount = async () => {
      try {
        const res = await api.get('/demo-users/count');
        if (res.data?.success) {
          setDemoCount(res.data.data.count || 0);
        }
      } catch (err) {
        console.error('Failed to fetch demo users count:', err);
      }
    };

    fetchDemoCount();
    const interval = setInterval(fetchDemoCount, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [user?.role]);

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
        <button 
          className="iconBtn sidebarClose" 
          onClick={onClose}
          title="Close sidebar"
          aria-label="Close sidebar"
        >
          <Icon name="close" />
        </button>
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
          <NavLink className="navItem" to="/leads" onClick={handleNavClick} title="Lead">
            <span className="navIcon">
              <Icon name="shoppingCart" size={20} />
            </span>
            <span className="navText">Lead</span>
          </NavLink>
        )}

        {hasPermission(user, 'customers') && (
          <NavLink className="navItem" to="/customers" onClick={handleNavClick} title="Customer">
            <span className="navIcon">
              <Icon name="users" size={20} />
            </span>
            <span className="navText">Customer</span>
          </NavLink>
        )}

        {hasPermission(user, 'deals') && (
          <NavLink className="navItem" to="/deals" onClick={handleNavClick} title="Deal">
            <span className="navIcon">
              <Icon name="deals" size={20} />
            </span>
            <span className="navText">Deal</span>
          </NavLink>
        )}

        {hasPermission(user, 'tasks') && (
          <NavLink className="navItem" to="/tasks" onClick={handleNavClick} title="Tasks">
            <span className="navIcon">
              <Icon name="tasks" size={20} />
            </span>
            <span className="navText">Tasks</span>
          </NavLink>
        )}

        {hasPermission(user, 'billing') && (
          <NavLink className="navItem" to="/billing" onClick={handleNavClick} title="Invoice">
            <span className="navIcon">
              <Icon name="billing" size={20} />
            </span>
            <span className="navText">Invoice</span>
          </NavLink>
        )}

        {hasPermission(user, 'reports') && (
          <NavLink className="navItem" to="/reports" onClick={handleNavClick} title="Report">
            <span className="navIcon">
              <Icon name="reports" size={20} />
            </span>
            <span className="navText">Report</span>
          </NavLink>
        )}

        {hasPermission(user, 'notifications') && (
          <NavLink className="navItem" to="/notifications" onClick={handleNavClick} title="Notification">
            <span className="navIcon">
              <Icon name="bell" size={20} />
            </span>
            <span className="navText">Notification</span>
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


        {user?.role === 'Admin' && (
          <NavLink className="navItem" to="/demo-users" onClick={handleNavClick} title="Demo Users">
            <span className="navIcon">
              <Icon name="users" size={20} />
            </span>
            <span className="navText">
              Demo Users
              {demoCount > 0 && (
                <span style={{
                  marginLeft: '8px',
                  backgroundColor: 'var(--danger)',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  padding: '2px 6px',
                  borderRadius: '10px'
                }}>
                  {demoCount}
                </span>
              )}
            </span>
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
