import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Icon } from './icons.jsx'
import { useAuth } from '../context/AuthContext'
import { hasPermission } from '../utils/accessControl'
import { statusesApi } from '../services/statuses'
import { rolesApi } from '../services/roles'

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const location = useLocation()
  const [openSubmenus, setOpenSubmenus] = useState({})
  const [dynamicMenu, setDynamicMenu] = useState({
    leads: [],
    deals: [],
    invoices: [],
    payments: [],
    users: []
  })

  // Handle group header click (Navigate + Toggle)
  const handleGroupClick = (e, item) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Navigate to the module's main page if path exists
    if (item.path) {
      go(item.path)
    }

    // Toggle the submenu
    setOpenSubmenus(prev => ({
      ...prev,
      [item.id]: !prev[item.id]
    }))
  }

  // Fetch system modules and statuses
  useEffect(() => {
    const fetchDynamics = async () => {
      try {
        const [leads, deals, invoices, payments, roles] = await Promise.all([
          statusesApi.list('lead').catch(() => []),
          statusesApi.list('deal').catch(() => []),
          statusesApi.list('invoice').catch(() => []),
          statusesApi.list('payment').catch(() => []),
          rolesApi.list().catch(() => [])
        ])

        const roleIcons = {
          'Admin': 'shield',
          'Manager': 'briefcase',
          'Accountant': 'billing',
          'HR': 'user',
          'Employee': 'users',
          'Sales': 'shoppingCart'
        }

        setDynamicMenu({
          leads: [
            { type: 'header', title: 'PIPELINE STAGES' },
            ...leads.map(s => ({ title: s.name, path: `/leads?status=${encodeURIComponent(s.name)}`, icon: 'filter' }))
          ],
          deals: [
            { type: 'header', title: 'DEAL STAGES' },
            { title: 'New', path: '/deals?stage=New', icon: 'plus' },
            { title: 'Qualified', path: '/deals?stage=Qualified', icon: 'check' },
            { title: 'Proposal', path: '/deals?stage=Proposal', icon: 'edit' },
            ...deals
              .filter(s => s.name.toLowerCase() !== 'qecq')
              .map(s => ({ title: s.name, path: `/deals?stage=${encodeURIComponent(s.name)}`, icon: 'activity' })),
            { title: 'Won', path: '/deals?stage=Won', icon: 'check' },
            { title: 'Lost', path: '/deals?stage=Lost', icon: 'close' }
          ].filter((v, i, a) => a.findIndex(t => t.title === v.title) === i),
          invoices: [
            { type: 'header', title: 'BILLING STATUS' },
            ...(invoices.length > 0 
              ? invoices.map(s => ({ title: s.name, path: `/invoices?status=${encodeURIComponent(s.name)}`, icon: 'billing' }))
              : [
                  { title: 'Draft', path: '/invoices?status=Draft', icon: 'edit' },
                  { title: 'Sent', path: '/invoices?status=Sent', icon: 'bell' },
                  { title: 'Paid', path: '/invoices?status=Paid', icon: 'check' },
                  { title: 'Overdue', path: '/invoices?status=Overdue', icon: 'alert' }
                ])
          ],
          payments: [
            { type: 'header', title: 'PAYMENT STATUS' },
            ...(payments.length > 0
              ? payments.map(s => ({ title: s.name, path: `/payments?status=${encodeURIComponent(s.name)}`, icon: 'activity' }))
              : [
                  { title: 'Successful', path: '/payments?status=Successful', icon: 'check', statusColor: '#22c55e' },
                  { title: 'Pending', path: '/payments?status=Pending', icon: 'clock', statusColor: '#f59e0b' },
                  { title: 'Failed', path: '/payments?status=Failed', icon: 'close', statusColor: '#ef4444' }
                ])
          ],
          users: [
            { title: 'Active', path: '/users?status=active', icon: 'check', statusColor: '#22c55e' },
            { title: 'Inactive', path: '/users?status=inactive', icon: 'close', statusColor: '#ef4444' },
            { type: 'header', title: 'ROLE FILTERS' },
            { title: 'Select All Roles', path: '/users', icon: 'users' },
            ...roles.map(r => ({ 
              title: r.name, 
              path: `/users?role=${encodeURIComponent(r.name)}`, 
              icon: roleIcons[r.name] || 'user'
            }))
          ]
        })
      } catch (e) {
        console.error('Sidebar sync failed', e)
      }
    }
    fetchDynamics()
  }, [])

  // Auto-expand submenus if a child is active
  useEffect(() => {
    const findAndExpandActive = () => {
      const activeId = menuConfig.find(item => 
        item.subItems?.some(sub => location.pathname + location.search === sub.path)
      )?.id
      
      if (activeId) {
        setOpenSubmenus(prev => ({ ...prev, [activeId]: true }))
      }
    }
    findAndExpandActive()
  }, [location.pathname, location.search, dynamicMenu])

  function go(to) {
    navigate(to)
  }

  function handleNavClick() {
    if (window.innerWidth <= 900) {
      onClose()
    }
  }

  const quickActions = [
    { id: 'add_user', title: 'Add User', path: '/users?add=true', icon: 'user', permission: 'users' },
    { id: 'add_lead', title: 'Add Lead', path: '/leads/new', icon: 'shoppingCart', permission: 'leads' },
    { id: 'new_deal', title: 'New Deal', path: '/deals?addDeal=true', icon: 'deals', permission: 'deals' },
    { id: 'create_invoice', title: 'Create Invoice', path: '/invoices/new', icon: 'billing', permission: 'invoices' },
  ]

  const menuConfig = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: 'dashboard',
      path: '/dashboard',
    },
    {
      id: 'users',
      title: 'Users',
      icon: 'user',
      path: '/users',
      permission: 'users',
      createPath: '/users?add=true',
      subItems: [
        ...dynamicMenu.users
      ]
    },
    {
      id: 'leads',
      title: 'Leads',
      icon: 'shoppingCart',
      path: '/leads',
      permission: 'leads',
      createPath: '/leads/new',
      subItems: [
        ...dynamicMenu.leads
      ]
    },
    {
      id: 'deals',
      title: 'Deals',
      icon: 'deals',
      path: '/deals',
      permission: 'deals',
      createPath: '/deals?addDeal=true',
      subItems: [
        ...dynamicMenu.deals
      ]
    },
    {
      id: 'payments',
      title: 'Payments',
      icon: 'activity',
      path: '/payments',
      permission: 'payments',
      createPath: '/payments/new',
      subItems: [
        ...dynamicMenu.payments
      ]
    },
    {
      id: 'invoices',
      title: 'Invoices',
      icon: 'billing',
      path: '/invoices',
      permission: 'invoices',
      createPath: '/invoices/new',
      subItems: [
        ...dynamicMenu.invoices
      ]
    },
    {
      id: 'reports',
      title: 'Reports',
      icon: 'reports',
      permission: 'reports',
      path: '/reports'
    },
    {
      id: 'attendance',
      title: 'Attendance / Leave',
      icon: 'calendar',
      permission: 'attendance',
      path: '/attendance'
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: 'settings',
      permission: 'settings',
      path: '/settings'
    },
    {
      id: 'trash',
      title: 'Trash',
      icon: 'trash',
      permission: 'trash',
      path: '/trash'
    }
  ]

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
          <div className="brandMark">
            <Icon name="activity" />
          </div>
          <div className="brandText">
            <div className="brandName">CRM PRO</div>
            <div className="brandSub muted">Operational Suite</div>
          </div>
        </div>
      </div>

      <div className="sidebarNav">
        {/* QUICK ACTIONS SECTION */}
        <div className="navSection">
          <div className="navSectionLabel">QUICK ACTIONS</div>
          <div className="quickActionsGrid">
            {quickActions.map(action => (
              hasPermission(user, action.permission) && (
                <button 
                  key={action.id} 
                  className="quickActionBtn" 
                  onClick={() => go(action.path)}
                  title={action.title}
                >
                  <Icon name={action.icon} />
                </button>
              )
            ))}
          </div>
        </div>

        <div className="navSection">
          <div className="navSectionLabel">MAIN MENU</div>
          {menuConfig.map((item) => {
            if (item.permission && !hasPermission(user, item.permission)) return null

            const hasSubItems = item.subItems && item.subItems.length > 0
            const isExpanded = openSubmenus[item.id]

            if (hasSubItems) {
              return (
                <div key={item.id} className={`navGroup ${isExpanded ? 'expanded' : ''}`}>
                  <div 
                    className={`navItem groupHeader ${location.pathname.startsWith(item.path || '/' + item.id) ? 'activeParent' : ''}`}
                    onClick={(e) => handleGroupClick(e, item)}
                    title={item.title}
                  >
                    <span className="navIcon">
                      <Icon name={item.icon} />
                    </span>
                    <span className="navText">{item.title}</span>
                    
                    {item.createPath && (
                      <button 
                        className="addInlineBtn"
                        onClick={(e) => {
                          e.stopPropagation()
                          go(item.createPath)
                        }}
                        title={`Add ${item.title}`}
                      >
                        <Icon name="plus" size={12} />
                      </button>
                    )}

                    <span className="chevron">
                      <Icon name="chevronDown" />
                    </span>
                  </div>
                  
                  <div className="navSubmenu">
                    {item.subItems.map((sub, idx) => {
                      if (sub.type === 'header') {
                        return (
                          <div key={idx} className="submenuHeader">
                            <span>{sub.title}</span>
                            <div className="headerLine" />
                          </div>
                        )
                      }
                      return (
                        <NavLink 
                          key={idx} 
                          className="navItem submenuItem" 
                          to={sub.path} 
                          onClick={handleNavClick}
                        >
                          <span className="navIcon subIcon" style={sub.statusColor ? { color: sub.statusColor } : {}}>
                            <Icon name={sub.icon || 'activity'} />
                          </span>
                          <span className="navText">{sub.title}</span>
                          {sub.count !== undefined && (
                            <span className="countBadge">{sub.count}</span>
                          )}
                        </NavLink>
                      )
                    })}
                  </div>
                </div>
              )
            }

            return (
              <NavLink 
                key={item.id} 
                className="navItem" 
                to={item.path} 
                end={item.path === '/'} 
                onClick={handleNavClick} 
                title={item.title}
              >
                <span className="navIcon">
                  <Icon name={item.icon} />
                </span>
                <span className="navText">{item.title}</span>
              </NavLink>
            )
          })}
        </div>
      </div>

      <div className="sidebarBottom">
        <div className="userCard" onClick={() => go('/profile')} role="button">
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
