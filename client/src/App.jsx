import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/Login'
import HomePage from './pages/HomePage'
import Layout from './layout/Layout'
import RegisterPage from './pages/RegisterPage'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Check authentication status on app load
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/profile', {
          method: 'GET',
          credentials: 'include', // Include cookies
        })

        if (response.ok) {
          const data = await response.json()
          setIsLoggedIn(true)
          // Update user info in localStorage
          localStorage.setItem('user', JSON.stringify(data.user))
        } else {
          setIsLoggedIn(false)
          // Clear any existing user data
          localStorage.removeItem('user')
        }
      } catch (error) {
        console.error('Auth check error:', error)
        setIsLoggedIn(false)
        localStorage.removeItem('user')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthStatus()
  }, [])

  const handleLogin = () => {
    setIsLoggedIn(true)
  }

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:3001/api/logout', {
        method: 'POST',
        credentials: 'include', // Include cookies
      })
    } catch (error) {
      console.error('Logout error:', error)
    }
    
    setIsLoggedIn(false)
    localStorage.removeItem('user')
  }

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00AABB] mx-auto"></div>
          <p className="mt-2 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  console.log('App component rendered - isLoggedIn:', isLoggedIn)
  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={!isLoggedIn ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/" />} 
        />
        <Route 
          path="/register" 
          element={!isLoggedIn ? <RegisterPage onLogin={handleLogin} /> : <Navigate to="/" />} 
        />
        
        {/* Protected routes with layout */}
        <Route 
          path="/" 
          element={isLoggedIn ? <Layout onLogout={handleLogout} /> : <Navigate to="/login" />}
        >
          <Route index element={<HomePage />} />
          {/* Add more protected routes here later */}
          {/* <Route path="profile" element={<ProfilePage />} /> */}
          {/* <Route path="settings" element={<SettingsPage />} /> */}
        </Route>
      </Routes>
    </Router>
  )
}

export default App