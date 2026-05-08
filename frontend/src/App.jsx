import { Navigate, Route, Routes, Outlet, useParams } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './index.css'
import './styles/crm-standard.css'
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
import PaymentsList from './modules/accountant/pages/PaymentsList.jsx'
import InvoicesList from './modules/accountant/pages/InvoicesList.jsx'
import PaymentForm from './modules/accountant/pages/PaymentForm.jsx'
import PaymentDetail from './modules/accountant/pages/PaymentDetail.jsx'
import InvoiceForm from './modules/accountant/pages/InvoiceForm.jsx'
import InvoiceDetail from './modules/accountant/pages/InvoiceDetail.jsx'
import ExpensesList from './modules/accountant/pages/ExpensesList.jsx'
import ExpenseForm from './modules/accountant/pages/ExpenseForm.jsx'
import Settings from './modules/admin/pages/Settings.jsx'
import Notifications from './modules/admin/pages/Notifications.jsx'
import Reports from './pages/Reports.jsx'
import Filters from './modules/admin/pages/Filters.jsx'
import PaginationSettings from './modules/admin/pages/PaginationSettings.jsx'
import TrashList from './modules/admin/pages/TrashList.jsx'
import AttendanceMgmt from './modules/hr/pages/AttendanceMgmt.jsx'
import LeavesMgmt from './modules/hr/pages/LeavesMgmt.jsx'
import EmployeeList from './modules/hr/pages/EmployeeList.jsx'
import EmployeeForm from './modules/hr/pages/EmployeeForm.jsx'
import EmployeeProfile from './modules/hr/pages/EmployeeProfile.jsx'
import HRDashboard from './modules/hr/pages/HRDashboard.jsx'
import PayrollDashboard from './modules/hr/pages/PayrollDashboard.jsx'
import FollowupsModule from './modules/crm/pages/FollowupsModule.jsx'
import RecycleBinIntelligence from './components/RecycleBinIntelligence.jsx'

// Page Imports
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Profile from './pages/Profile.jsx'

import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { ROLE_GROUPS, ROLES } from './utils/accessControl'
import LandingPage from './pages/LandingPage.jsx'
import AboutPage from './pages/AboutPage.jsx'
import FeaturesPage from './pages/FeaturesPage.jsx'
import ContactPage from './pages/ContactPage.jsx'
import TrialExpiredPage from './pages/TrialExpiredPage.jsx'
import { useAuth } from './context/AuthContext'
import ScrollToTop from './components/ScrollToTop.jsx'
import EnterToNextField from './components/EnterToNextField.jsx'

const Home = () => {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/dashboard" replace /> : <LandingPage />
}

const UserEditRedirect = () => {
  const { id } = useParams()
  return <Navigate to={`/users?edit=${id}`} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ScrollToTop />
        <EnterToNextField />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Login />} />
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
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

          <Route path="/activities" element={<ProtectedRoute permission="activities"><FollowupsModule /></ProtectedRoute>} />

          <Route path="/customers" element={<ProtectedRoute permission="customers"><CustomersList /></ProtectedRoute>} />
          <Route path="/customers/new" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE]}><CustomerForm mode="create" /></ProtectedRoute>} />
          <Route path="/customers/:id" element={<ProtectedRoute permission="customers"><CustomerDetail /></ProtectedRoute>} />
          <Route path="/customers/:id/edit" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE]}><CustomerForm mode="edit" /></ProtectedRoute>} />

          <Route path="/leads" element={<ProtectedRoute permission="leads"><LeadsList /></ProtectedRoute>} />
          <Route path="/leads/new" element={<ProtectedRoute permission="leads"><LeadForm mode="create" /></ProtectedRoute>} />
          <Route path="/leads/:id/edit" element={<ProtectedRoute permission="leads"><LeadForm mode="edit" /></ProtectedRoute>} />
          <Route path="/leads/:id" element={<ProtectedRoute permission="leads"><LeadDetail /></ProtectedRoute>} />

          <Route path="/deals" element={<ProtectedRoute permission="deals"><DealsList /></ProtectedRoute>} />
          <Route path="/deals/new" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE]}><DealForm mode="create" /></ProtectedRoute>} />
          <Route path="/deals/analytics" element={<ProtectedRoute permission="deals"><DealAnalytics /></ProtectedRoute>} />
          <Route path="/deals/:id" element={<ProtectedRoute permission="deals"><DealDetail /></ProtectedRoute>} />
          <Route path="/deals/:id/edit" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE]}><DealForm mode="edit" /></ProtectedRoute>} />

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
            <Route path="/users/new" element={<Navigate to="/users?add=true" replace />} />
            <Route path="/users/:id" element={<UserDetail />} />
            <Route 
              path="/users/:id/edit" 
              element={<UserEditRedirect />} 
            />
          </Route>

          {/* HR Module Routes (Overhauled) */}
          <Route path="/hr/dashboard" element={<ProtectedRoute permission="hr"><HRDashboard /></ProtectedRoute>} />
          <Route path="/hr/employees" element={<ProtectedRoute permission="employees"><EmployeeList /></ProtectedRoute>} />
          <Route path="/hr/employees/new" element={<ProtectedRoute permission="employees"><EmployeeForm /></ProtectedRoute>} />
          <Route path="/hr/employees/edit/:id" element={<ProtectedRoute permission="employees"><EmployeeForm /></ProtectedRoute>} />
          <Route path="/hr/employees/:id" element={<ProtectedRoute permission="employees"><EmployeeProfile /></ProtectedRoute>} />
          <Route path="/hr/attendance" element={<ProtectedRoute permission="attendance"><AttendanceMgmt /></ProtectedRoute>} />
          <Route path="/hr/leaves" element={<ProtectedRoute permission="leaves"><LeavesMgmt /></ProtectedRoute>} />
          <Route path="/hr/payroll" element={<ProtectedRoute permission="payroll"><PayrollDashboard /></ProtectedRoute>} />
          <Route path="/hr/performance" element={<ProtectedRoute permission="performance"><div className="crmContent"><h1>Performance</h1><p>Module under development</p></div></ProtectedRoute>} />
          <Route path="/activities" element={<ProtectedRoute permission="activities"><FollowupsModule /></ProtectedRoute>} />
          <Route path="/hr/documents" element={<ProtectedRoute permission="hrdocs"><div className="crmContent"><h1>Documents</h1><p>Module under development</p></div></ProtectedRoute>} />
          <Route path="/hr/exit" element={<ProtectedRoute permission="exitmgmt"><div className="crmContent"><h1>Exit Management</h1><p>Module under development</p></div></ProtectedRoute>} />

          <Route
            element={
              <ProtectedRoute permission="payments">
                <Outlet />
              </ProtectedRoute>
            }
          >
            <Route path="/payments" element={<PaymentsList />} />
            <Route path="/payments/new" element={<PaymentForm mode="create" />} />
            <Route path="/payments/:id" element={<PaymentDetail />} />
            <Route path="/payments/:id/edit" element={<PaymentForm mode="edit" />} />
          </Route>

          <Route
            element={
              <ProtectedRoute permission="invoices">
                <Outlet />
              </ProtectedRoute>
            }
          >
            <Route path="/invoices" element={<InvoicesList />} />
            <Route path="/invoices/new" element={<InvoiceForm mode="create" />} />
            <Route path="/invoices/:id" element={<InvoiceDetail />} />
            <Route path="/invoices/:id/edit" element={<InvoiceForm mode="edit" />} />
          </Route>

          <Route
            element={
              <ProtectedRoute permission="expenses">
                <Outlet />
              </ProtectedRoute>
            }
          >
            <Route path="/expenses" element={<ExpensesList />} />
            <Route path="/expenses/new" element={<ExpenseForm mode="create" />} />
            <Route path="/expenses/:id/edit" element={<ExpenseForm mode="edit" />} />
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
            <Route path="/settings/roles" element={<Settings />} />
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

          <Route path="/reports/team" element={<ProtectedRoute permission="teamPerformance"><div className="crmContent"><h1>Team Performance</h1><p>Module under development</p></div></ProtectedRoute>} />

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

          <Route path="/trash" element={<TrashList />} />
          <Route path="/recycle-bin" element={<RecycleBinIntelligence />} />

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
      </NotificationProvider>
    </AuthProvider>
  )
}
