import { Navigate, Route, Routes, Outlet } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './App.css'
import AppLayout from './layouts/AppLayout.jsx'
import PublicLayout from './layouts/PublicLayout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import AccessDenied from './pages/AccessDenied.jsx'
import CustomersList from './modules/crm/pages/CustomersList.jsx'
import CustomerDetail from './modules/crm/pages/CustomerDetail.jsx'
import CustomerForm from './modules/crm/pages/CustomerForm.jsx'
import LeadsList from './modules/crm/pages/LeadsList.jsx'
import LeadForm from './modules/crm/pages/LeadForm.jsx'
import LeadDetail from './modules/crm/pages/LeadDetail.jsx'
import DealsList from './modules/crm/pages/DealsList.jsx'
import DealForm from './modules/crm/pages/DealForm.jsx'
import DealDetail from './modules/crm/pages/DealDetail.jsx'
import DealAnalytics from './modules/crm/pages/DealAnalytics.jsx'
// Core Module Imports
import SupportList from './modules/crm/pages/SupportList.jsx'
import TicketDetail from './modules/crm/pages/TicketDetail.jsx'
import TicketForm from './modules/crm/pages/TicketForm.jsx'
import UserForm from './modules/admin/pages/UserForm.jsx'
import UsersList from './modules/admin/pages/UsersList.jsx'
import UserDetail from './modules/admin/pages/UserDetail.jsx'
import Billing from './modules/admin/pages/Billing.jsx'
import Settings from './modules/admin/pages/Settings.jsx'
import Notifications from './modules/admin/pages/Notifications.jsx'
import Reports from './pages/Reports.jsx'
import TasksList from './modules/crm/pages/TasksList.jsx'
import FollowupsModule from './modules/crm/pages/FollowupsModule.jsx'
import Filters from './modules/admin/pages/Filters.jsx'
import PaginationSettings from './modules/admin/pages/PaginationSettings.jsx'
import TrashList from './modules/admin/pages/TrashList.jsx'

// Page Imports
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Profile from './pages/Profile.jsx'

import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { ROLE_GROUPS, NAV_ACCESS } from './utils/accessControl'
import LandingPage from './pages/LandingPage.jsx'
import AboutPage from './pages/AboutPage.jsx'
import FeaturesPage from './pages/FeaturesPage.jsx'
import TrialExpiredPage from './pages/TrialExpiredPage.jsx'
import { useAuth } from './context/AuthContext'
import ScrollToTop from './components/ScrollToTop.jsx'
import EnterToNextField from './components/EnterToNextField.jsx'

const Home = () => {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/dashboard" replace /> : <LandingPage />
}

export default function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <EnterToNextField />
      <Routes>
        {/* Public & Auth Routes (Centralized Header) */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/access-denied" element={<AccessDenied />} />
          <Route path="/trial-expired" element={<TrialExpiredPage />} />
        </Route>

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/reports" element={<ProtectedRoute permission="reports"><Reports /></ProtectedRoute>} />
          <Route path="/profile" element={<Profile />} />

          <Route path="/customers" element={<ProtectedRoute permission="customers"><CustomersList /></ProtectedRoute>} />
          <Route path="/customers/new" element={<ProtectedRoute permission="customers"><CustomerForm mode="create" /></ProtectedRoute>} />
          <Route path="/customers/:id" element={<ProtectedRoute permission="customers"><CustomerDetail /></ProtectedRoute>} />
          <Route path="/customers/:id/edit" element={<ProtectedRoute permission="customers"><CustomerForm mode="edit" /></ProtectedRoute>} />

          <Route path="/leads" element={<ProtectedRoute permission="leads"><LeadsList /></ProtectedRoute>} />
          <Route path="/leads/new" element={<ProtectedRoute permission="leads"><LeadForm mode="create" /></ProtectedRoute>} />
          <Route path="/leads/:id/edit" element={<ProtectedRoute permission="leads"><LeadForm mode="edit" /></ProtectedRoute>} />
          <Route path="/leads/:id" element={<ProtectedRoute permission="leads"><LeadDetail /></ProtectedRoute>} />

          <Route path="/deals" element={<ProtectedRoute permission="deals"><DealsList /></ProtectedRoute>} />
          <Route path="/deals/new" element={<ProtectedRoute permission="deals"><DealForm mode="create" /></ProtectedRoute>} />
          <Route path="/deals/analytics" element={<ProtectedRoute permission="deals"><DealAnalytics /></ProtectedRoute>} />
          <Route path="/deals/:id" element={<ProtectedRoute permission="deals"><DealDetail /></ProtectedRoute>} />
          <Route path="/deals/:id/edit" element={<ProtectedRoute permission="deals"><DealForm mode="edit" /></ProtectedRoute>} />

          <Route path="/tickets" element={<ProtectedRoute permission="tickets"><SupportList /></ProtectedRoute>} />
          <Route path="/tickets/new" element={<ProtectedRoute permission="tickets"><TicketForm mode="create" /></ProtectedRoute>} />
          <Route path="/tickets/:id" element={<ProtectedRoute permission="tickets"><TicketDetail /></ProtectedRoute>} />
          <Route path="/tickets/:id/edit" element={<ProtectedRoute permission="tickets"><TicketForm mode="edit" /></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute permission="tickets"><SupportList /></ProtectedRoute>} />
          <Route path="/support/:id" element={<ProtectedRoute permission="tickets"><TicketDetail /></ProtectedRoute>} />


          <Route
            element={
              <ProtectedRoute permission="users">
                <Outlet />
              </ProtectedRoute>
            }
          >
            <Route path="/users" element={<UsersList />} />
            <Route path="/users/new" element={<UserForm mode="create" />} />
            <Route path="/users/:id" element={<UserDetail />} />
            <Route path="/users/:id/edit" element={<UserForm mode="edit" />} />
          </Route>

          <Route
            element={
              <ProtectedRoute permission="billing">
                <Outlet />
              </ProtectedRoute>
            }
          >
            <Route path="/billing" element={<Billing />} />
          </Route>

          <Route
            element={
              <ProtectedRoute permission="settings">
                <Outlet />
              </ProtectedRoute>
            }
          >
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route
            element={
              <ProtectedRoute permission="notifications">
                <Outlet />
              </ProtectedRoute>
            }
          >
            <Route path="/notifications" element={<Notifications />} />
          </Route>

          <Route
            element={
              <ProtectedRoute allowedRoles={ROLE_GROUPS.admins}>
                <Outlet />
              </ProtectedRoute>
            }
          >
            <Route path="/filters" element={<Filters />} />
            <Route path="/pagination" element={<PaginationSettings />} />
          </Route>


          <Route
            element={
              <ProtectedRoute permission="tasks">
                <Outlet />
              </ProtectedRoute>
            }
          >
            <Route path="/tasks" element={<TasksList />} />
            <Route path="/followups" element={<FollowupsModule />} />
          </Route>




          <Route path="/trash" element={<TrashList />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </AuthProvider>
  )
}
