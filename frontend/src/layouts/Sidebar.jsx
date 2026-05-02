import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Icon } from './icons.jsx'
import { useAuth } from '../context/AuthContext'
import { hasPermission } from '../utils/accessControl'
import { statusesApi } from '../services/statuses'
import { rolesApi } from '../services/roles'

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const location = useLocation()
  const [openSubmenus, setOpenSubmenus] = useState({})
  const [dynamicMenu, setDynamicMenu] = useState({
    leads: [],
    deals: [],
    invoices: [],
    payments: [],
    customers: [],
    support: [],
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
        const { leadsApi } = await import('../services/leads.js')
        const { dealsApi } = await import('../services/deals.js')
        const { customersApi } = await import('../services/customers.js')
        const { supportApi } = await import('../services/workflow.js')
        const { invoicesApi } = await import('../services/invoices.js')
        const { paymentsApi } = await import('../services/payments.js')

        const [leadsRes, dealsRes, customersRes, supportRes, invoicesRes, paymentsRes, rolesRes] = await Promise.all([
          leadsApi.list({ limit: 1 }).catch(() => ({ summary: { byStatus: {} } })),
          dealsApi.list({ limit: 1 }).catch(() => ({ summary: { byStage: {} } })),
          customersApi.list({ limit: 1 }).catch(() => ({ summary: { byStatus: {} } })),
          supportApi.list({ limit: 1 }).catch(() => ({ summary: { byStatus: {} } })),
          invoicesApi.list({ limit: 1 }).catch(() => ({ summary: { byStatus: {} } })),
          paymentsApi.list({ limit: 1 }).catch(() => ({ summary: { byStatus: {} } })),
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

        const formatStatus = (s) => s.charAt(0).toUpperCase() + s.slice(1)

        setDynamicMenu({
          leads: [
            { type: 'header', title: 'PIPELINE STAGES' },
            ...Object.entries(leadsRes.summary?.byStatus || {}).map(([name, count]) => ({
              title: formatStatus(name),
              path: `/leads?status=${encodeURIComponent(name)}`,
              icon: 'filter',
              count
            }))
          ],
          deals: [
            { type: 'header', title: 'DEAL STAGES' },
            ...Object.entries(dealsRes.summary?.byStage || {}).map(([name, count]) => ({
              title: formatStatus(name),
              path: `/deals?stage=${encodeURIComponent(name)}`,
              icon: 'activity',
              count
            }))
          ],
          customers: [
            { type: 'header', title: 'CUSTOMER SEGMENTS' },
            ...Object.entries(customersRes.summary?.byStatus || {}).map(([name, count]) => ({
              title: formatStatus(name),
              path: `/customers?status=${encodeURIComponent(name)}`,
              icon: 'filter',
              count
            }))
          ],
          support: [
            { type: 'header', title: 'TICKET STATUS' },
            ...Object.entries(supportRes.summary?.byStatus || {}).map(([name, count]) => ({
              title: formatStatus(name),
              path: `/tickets?status=${encodeURIComponent(name)}`,
              icon: 'help',
              count
            }))
          ],
          invoices: [
            { type: 'header', title: 'BILLING STATUS' },
            ...Object.entries(invoicesRes.summary?.byStatus || {}).map(([name, count]) => ({
              title: formatStatus(name),
              path: `/invoices?status=${encodeURIComponent(name)}`,
              icon: 'billing',
              count
            }))
          ],
          payments: [
            { type: 'header', title: 'PAYMENT STATUS' },
            ...Object.entries(paymentsRes.summary?.byStatus || {}).map(([name, count]) => ({
              title: formatStatus(name),
              path: `/payments?status=${encodeURIComponent(name)}`,
              icon: 'activity',
              count
            }))
          ],
          users: [
            { title: 'Active', path: '/users?status=active', icon: 'check', statusColor: '#22c55e' },
            { title: 'Inactive', path: '/users?status=inactive', icon: 'close', statusColor: '#ef4444' },
            { type: 'header', title: 'ROLE FILTERS' },
            { title: 'Select All Roles', path: '/users', icon: 'users' },
            ...rolesRes.map(r => ({ 
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
      id: 'customers',
      title: 'Customers',
      icon: 'user',
      path: '/customers',
      permission: 'customers',
      createPath: '/customers/new',
      subItems: [
        ...dynamicMenu.customers
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
      id: 'support',
      title: 'Tickets',
      icon: 'help',
      path: '/tickets',
      permission: 'tickets',
      createPath: '/tickets/new',
      subItems: [
        ...dynamicMenu.support
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
      id: 'expenses',
      title: 'Expenses',
      icon: 'billing',
      path: '/expenses',
      permission: 'expenses',
      createPath: '/expenses/new'
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


        <div className="navSection">
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

        <button className="sidebarLogoutBtn" onClick={logout} title="Sign Out">
          <Icon name="logout" size={18} />
          <span className="navText">Logout</span>
        </button>
      </div>
    </aside>
  )
}
