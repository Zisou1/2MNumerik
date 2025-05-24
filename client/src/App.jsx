import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/Login'
import HomePage from './pages/HomePage'
import Layout from './layout/Layout'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const handleLogin = () => {
    setIsLoggedIn(true)
  }
  const handleLogout = () => {
    setIsLoggedIn(false)
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={!isLoggedIn ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/" />} 
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