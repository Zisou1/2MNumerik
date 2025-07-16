import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import LoginPage from './pages/Login'
import HomePage from './pages/HomePage'
import ManagementPage from './pages/ManagementPage' 
import ProductsPage from './pages/ProductsPage'
import ClientsPage from './pages/ClientsPage'
import HistoryOrdersPage from './pages/HistoryOrdersPage'
import StatisticsPage from './pages/StatisticsPage'
import Layout from './layout/Layout'
import RegisterPage from './pages/RegisterPage'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardPage from './pages/DashboardPage'
import UnauthorizedPage from './pages/UnauthorizedPage'
import DashboardPageImproved from './pages/DashboardPageImproved'
import SettingsPage from './pages/SettingsPage'


// Separate component to use auth context
function AppRoutes() {
  const { isAuthenticated, logout } = useAuth()

  return (
    <Routes>
      <Route 
        path="/login" 
        element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />} 
      />
      <Route 
        path="/register" 
        element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/" replace />} 
      />
      <Route 
        path="/unauthorized" 
        element={<UnauthorizedPage/>} // Replace with UnauthorizedPage component
      />
      
      {/* Protected routes with layout - no role restriction */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Layout onLogout={logout} />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
        
        {/* Admin-only routes */}
        <Route 
          path="/management" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ManagementPage/> {/* Replace with AdminPage component */}
            </ProtectedRoute>
          } 
        />
        
        {/* Routes for both admin and manager */}
        <Route 
          path="management" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <div>Management Page</div> {/* Replace with ManagementPage component */}
            </ProtectedRoute>
          } 
        />
        {/* Admin-only statistics route */}
        <Route 
          path="statistics" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <StatisticsPage />
            </ProtectedRoute>
          } 
        />
        
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="history" element={<HistoryOrdersPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="clients" element={<ClientsPage />} />
        {/* Admin-only settings route */}
        <Route 
          path="settings" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <SettingsPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Regular user routes (no role restriction beyond authentication) */}
        <Route path="profile" element={<DashboardPageImproved />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <AppRoutes />
        </Router>
      </NotificationProvider>
    </AuthProvider>
  )
}

export default App