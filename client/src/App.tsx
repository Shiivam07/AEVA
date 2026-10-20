import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { Toaster } from './components/ui/toaster'

// Pages
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import OwnerDashboard from './pages/owner/OwnerDashboard'
import CollaboratorDashboard from './pages/collaborator/CollaboratorDashboard'
import BrandsPage from './pages/owner/BrandsPage'
import BrandDetailPage from './pages/owner/BrandDetailPage'
import TasksPage from './pages/owner/TasksPage'
import TaskDetailPage from './pages/owner/TaskDetailPage'
import OrdersPage from './pages/owner/OrdersPage'
import ProductsPage from './pages/owner/ProductsPage'
import PeoplePage from './pages/owner/PeoplePage'
import FinancialsPage from './pages/owner/FinancialsPage'
import DistributionsPage from './pages/owner/DistributionsPage'
import ReportsPage from './pages/owner/ReportsPage'
import NotificationsPage from './pages/NotificationsPage'
import ProfilePage from './pages/ProfilePage'
import DailyTasksPage from './pages/owner/DailyTasksPage'
import NotFoundPage from './pages/NotFoundPage'

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, isLoading } = useAuth()
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }
  
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user.accountType)) {
    return <Navigate to="/unauthorized" replace />
  }
  return <>{children}</>
}

function RootRedirect() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (user.accountType === 'PLATFORM_ADMIN') return <Navigate to="/admin" replace />
  if (user.accountType === 'BUSINESS_OWNER') return <Navigate to="/dashboard" replace />
  return <Navigate to="/my-tasks" replace />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<RootRedirect />} />

            {/* Platform Admin */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['PLATFORM_ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />

            {/* Business Owner */}
            <Route path="/dashboard" element={
              <ProtectedRoute allowedRoles={['BUSINESS_OWNER']}>
                <OwnerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/brands" element={<ProtectedRoute allowedRoles={['BUSINESS_OWNER']}><BrandsPage /></ProtectedRoute>} />
            <Route path="/brands/:id" element={<ProtectedRoute allowedRoles={['BUSINESS_OWNER']}><BrandDetailPage /></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute allowedRoles={['BUSINESS_OWNER']}><TasksPage /></ProtectedRoute>} />
            <Route path="/tasks/:id" element={<ProtectedRoute><TaskDetailPage /></ProtectedRoute>} />
            <Route path="/daily-tasks" element={<ProtectedRoute allowedRoles={['BUSINESS_OWNER']}><DailyTasksPage /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute allowedRoles={['BUSINESS_OWNER']}><OrdersPage /></ProtectedRoute>} />
            <Route path="/products" element={<ProtectedRoute allowedRoles={['BUSINESS_OWNER']}><ProductsPage /></ProtectedRoute>} />
            <Route path="/people" element={<ProtectedRoute allowedRoles={['BUSINESS_OWNER']}><PeoplePage /></ProtectedRoute>} />
            <Route path="/financials" element={<ProtectedRoute allowedRoles={['BUSINESS_OWNER']}><FinancialsPage /></ProtectedRoute>} />
            <Route path="/distributions" element={<ProtectedRoute allowedRoles={['BUSINESS_OWNER']}><DistributionsPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute allowedRoles={['BUSINESS_OWNER']}><ReportsPage /></ProtectedRoute>} />

            {/* Collaborator */}
            <Route path="/my-tasks" element={<ProtectedRoute allowedRoles={['COLLABORATOR']}><CollaboratorDashboard /></ProtectedRoute>} />

            {/* Shared */}
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <Toaster />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
