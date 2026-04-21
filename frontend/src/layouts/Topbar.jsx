import { useState } from "react"
import { Icon } from "./icons.jsx"
import { useAuth } from "../context/AuthContext"
import { useNavigate } from "react-router-dom"
import { hasRequiredRole, NAV_ACCESS } from "../utils/accessControl"
import NotificationDropdown from "../components/NotificationDropdown.jsx"
import GlobalSearch from "../components/GlobalSearch.jsx"

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
        <button className="iconBtn sidebarToggle" onClick={onToggleSidebar}>
          <Icon name="menu" />
        </button>
        <img src="/CRM_Logo.png" alt="CRM Logo" style={{ width: '32px', height: '32px', marginRight: '10px', objectFit: 'contain' }} />
        <h2 className="topbarTitle">{title}</h2>
      </div>

      {/* SEARCH */}
      <GlobalSearch />

      {/* RIGHT */}
      <div className="topbarRight">

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
