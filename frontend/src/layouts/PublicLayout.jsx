import React from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import LandingTopbar from '../components/LandingTopbar'

export default function PublicLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const motionKey = `${location.pathname}${location.search}${location.hash}`

  // Centralized demo entry handler for all public pages
  const handleDemoLogin = () => {
    navigate('/register', {
      state: { entry: 'demo', from: location.state?.from },
    })
  }

  // Get 'from' state to pass to the topbar if needed
  const from = location.state?.from

  return (
    <div className="public-layout">
      <LandingTopbar handleDemoLogin={handleDemoLogin} from={from} />
      <main className="public-main">
        <div key={motionKey} className="route-motion-shell public-route-motion">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
