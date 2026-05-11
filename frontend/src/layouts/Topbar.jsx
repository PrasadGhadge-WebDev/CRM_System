import { useState } from "react"
import { Icon } from "./icons.jsx"
import { useAuth } from "../context/AuthContext"
import { useNavigate } from "react-router-dom"
import { hasRequiredRole, NAV_ACCESS } from "../utils/accessControl"
import NotificationDropdown from "../components/NotificationDropdown.jsx"
import GlobalSearch from "../components/GlobalSearch.jsx"
import { DotLottieReact } from "@lottiefiles/dotlottie-react"
import menuData from "../assets/menu-animation.json"
import { FiClock, FiZap, FiMenu, FiPlusCircle } from "react-icons/fi"

export default function Topbar({
  title,
  searchText,
  onSearchTextChange,
  onSubmitSearch,
  theme,
  onToggleTheme,
  sidebarOpen,
  onToggleSidebar,
}) {
  const { user, logout, switchDemoRole } = useAuth()
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const navigate = useNavigate()

  const trialDaysLeft = user?.trial_ends_at 
    ? Math.ceil((new Date(user.trial_ends_at) - new Date()) / (24 * 60 * 60 * 1000))
    : 0;
  
  const showTrial = user?.is_trial && trialDaysLeft >= 0;

  const firstLetter =
    user?.username?.charAt(0).toUpperCase() || "A"

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const handleDropdownNavigate = (path) => {
    setOpen(false)
    navigate(path)
  }

  return (
    <header className="crmTopbar">

      {/* LEFT */}
      <div className="topbarLeft">
        <button className="iconBtn sidebarToggle" onClick={onToggleSidebar} style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', fontSize: '24px' }}>
          <FiMenu />
        </button>
        <img src="/CRM_Logo.png" alt="CRM Logo" style={{ width: '32px', height: '32px', marginRight: '10px', objectFit: 'contain' }} />
        <h2 className="topbarTitle">{title}</h2>
      </div>

      {/* SEARCH */}
      <GlobalSearch />

      {/* RIGHT */}
      <div className="topbarRight">
        {showTrial && (
          <div className="trial-badge-container" onClick={() => navigate('/billing')}>
            <div className="trial-badge-orb" />
            <FiZap className="trial-badge-icon" />
            <span className="trial-badge-text">
              {trialDaysLeft === 0 ? 'Last Day' : `${trialDaysLeft} Days Trial`}
            </span>
          </div>
        )}

        {/* QUICK ACTIONS */}
        {(user?.role === 'Employee' || user?.role === 'Admin') && (
          <div className="profileMenu" style={{ marginRight: '10px' }}>
            <button className="btn-premium primary" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }} onClick={() => setCreateOpen(!createOpen)}>
              <FiPlusCircle />
              <span className="hide-tablet">Quick Action</span>
            </button>
            {createOpen && (
              <div className="profileDropdown" style={{ right: 0, width: '220px' }}>
                <div className="dropdownItem" onClick={() => { navigate('/leads/new'); setCreateOpen(false); }}>
                  <Icon name="activity" />
                  Add Lead
                </div>
                <div className="dropdownItem" onClick={() => { navigate('/activities?add=true'); setCreateOpen(false); }}>
                  <Icon name="calendar" />
                  Schedule Follow-up
                </div>
                <div className="dropdownItem" onClick={() => { navigate('/deals'); setCreateOpen(false); }}>
                  <Icon name="deals" />
                  Update Deal Stage
                </div>
              </div>
            )}
          </div>
        )}

        <NotificationDropdown />

        <button className="iconBtn" onClick={onToggleTheme}>
          <Icon name={theme === "dark" ? "sun" : "moon"} />
        </button>

        {/* USER */}
        <div className="profileMenu">

          <div
            className="profileTrigger"
            onClick={() => setOpen(!open)}
          >
            {user?.profile_photo ? (
              <img
                src={user.profile_photo}
                alt={user?.username || "Profile"}
                className="avatar"
                style={{ objectFit: "cover" }}
              />
            ) : (
              <div className="avatar">
                {firstLetter}
              </div>
            )}
            <div className="profileText">
              <div className="profileName">
                {user?.username || "Admin"}
              </div>
              <div className="profileRole">
                {user?.role || "Admin"}
              </div>
            </div>

            <Icon name="chevronDown" />
          </div>

          {open && (
            <div className="profileDropdown">

              {hasRequiredRole(user?.role, NAV_ACCESS.profile) && (
                <div
                  className="dropdownItem"
                  onClick={() => handleDropdownNavigate("/profile")}
                >
                  <Icon name="user" />
                  Profile
                </div>
              )}

              {hasRequiredRole(user?.role, NAV_ACCESS.settings) && !user?.is_demo && (
                <div
                  className="dropdownItem"
                  onClick={() => handleDropdownNavigate("/settings")}
                >
                  <Icon name="settings" />
                  Settings
                </div>
              )}

              {(user?.is_demo || user?.is_trial) && (
                <>
                  <div className="dropdownDivider" />
                  <div className="dropdownItem" style={{ cursor: 'default', fontWeight: 700 }}>
                    Demo role switch
                  </div>
                  <div className="dropdownItem" onClick={() => switchDemoRole('Admin')}>
                    <Icon name="users" />
                    Admin
                  </div>
                  <div className="dropdownItem" onClick={() => switchDemoRole('Manager')}>
                    <Icon name="users" />
                    Manager
                  </div>
                  <div className="dropdownItem" onClick={() => switchDemoRole('Employee')}>
                    <Icon name="users" />
                    Employee
                  </div>
                  <div className="dropdownItem" onClick={() => switchDemoRole('Accountant')}>
                    <Icon name="users" />
                    Accountant
                  </div>
                  <div className="dropdownItem" onClick={() => switchDemoRole('HR')}>
                    <Icon name="users" />
                    HR
                  </div>
                </>
              )}

              <div className="dropdownDivider"></div>

              <div
                className="dropdownItem logout"
                onClick={handleLogout}
              >
                <Icon name="logOut" />
                Logout
              </div>

            </div>
          )}

        </div>

      </div>

    </header>
  )
}
