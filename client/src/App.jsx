import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/Login'
import HomePage from './pages/HomePage'
import ManagementPage from './pages/ManagementPage' 
import ProductsPage from './pages/ProductsPage'
import Layout from './layout/Layout'
import RegisterPage from './pages/RegisterPage'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardPage from './pages/DashboardPage'
import UnauthorizedPage from './pages/UnauthorizedPage'


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
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        {/* Regular user routes (no role restriction beyond authentication) */}
        {/* <Route path="profile" element={<ProfilePage />} /> */}
        {/* <Route path="settings" element={<SettingsPage />} /> */}
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  )
}

export default App