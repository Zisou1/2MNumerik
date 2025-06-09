import { useState } from 'react'
import { Outlet, useLocation, Link } from 'react-router-dom'
import logoPrimary from '../assets/logoprimary.png'
import { useAuth } from '../contexts/AuthContext'
import AlertDialog from '../components/AlertDialog'

function Layout({ onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const location = useLocation()
  const { user } = useAuth()
  const isActive = (path) => location.pathname === path

  const handleLogoutClick = () => {
    setShowLogoutDialog(true)
  }

  const handleLogoutConfirm = () => {
    setShowLogoutDialog(false)
    onLogout()
  }

  const handleLogoutCancel = () => {
    setShowLogoutDialog(false)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Alert Dialog */}
      <AlertDialog
        isOpen={showLogoutDialog}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
        title="Confirmation de déconnexion"
        message="Êtes-vous sûr de vouloir vous déconnecter ?"
        confirmText="Se déconnecter"
        cancelText="Annuler"
        type="danger"
      />

      {/* Navbar */}
      <nav className="bg-white shadow-md px-6 py-4 fixed top-0 left-0 right-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md hover:bg-[#00AABB] hover:text-white md:hidden"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside className={`bg-white shadow-md ${sidebarCollapsed ? 'md:w-16' : 'md:w-64'} w-64 fixed left-0 top-0 bottom-0 z-50 transform transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}>
          <nav className="p-4 h-full flex flex-col">
            {/* Hamburger menu and logo container */}
            <div className="flex items-center justify-between mb-4">
              {/* Mobile close button */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-md hover:bg-[#00AABB] hover:text-white md:hidden"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              {/* Logo */}
              <Link to="/" className="hidden md:flex justify-center">
                <img 
                  src={logoPrimary} 
                  alt="" 
                  className={`${sidebarCollapsed ? 'md:w-8 md:h-4' : 'md:w-32 md:h-16'} w-32 h-16 transition-all duration-300`}
                />
              </Link>
              
              {/* Desktop hamburger menu for sidebar collapse */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-md hover:bg-[#00AABB] hover:text-white hidden md:block"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
            
            {/* Main navigation items */}
            <ul className="space-y-2 flex-1">
              <li>
                <Link to="/" className={`flex items-center px-2 py-2 rounded ${sidebarCollapsed ? 'md:justify-center' : ''} ${
                  isActive('/') 
                    ? 'bg-[#00AABB] text-white' 
                    : 'text-gray-700 hover:bg-[#00AABB] hover:text-white'
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className={`ml-3 ${sidebarCollapsed ? 'md:hidden' : ''}`}>Accueil</span>
              </Link>
              </li>
              <li>
                <Link to="/dashboard" className={`flex items-center px-2 py-2 rounded ${sidebarCollapsed ? 'md:justify-center' : ''} ${
                  isActive('/dashboard') 
                    ? 'bg-[#00AABB] text-white' 
                    : 'text-gray-700 hover:bg-[#00AABB] hover:text-white'
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21l4-4 4 4" />
                  </svg>
                  <span className={`ml-3 ${sidebarCollapsed ? 'md:hidden' : ''}`}>Dashboard</span>
                </Link>
              </li>
              <li>
                <Link to="/products" className={`flex items-center px-2 py-2 rounded ${sidebarCollapsed ? 'md:justify-center' : ''} ${
                  isActive('/products') 
                    ? 'bg-[#00AABB] text-white' 
                    : 'text-gray-700 hover:bg-[#00AABB] hover:text-white'
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span className={`ml-3 ${sidebarCollapsed ? 'md:hidden' : ''}`}>Products</span>
                </Link>
              </li>
                {user?.role==='admin' &&(
                   <li>
                <Link to="/management" className={`flex items-center px-2 py-2 rounded ${sidebarCollapsed ? 'md:justify-center' : ''} ${
                  isActive('/management') 
                    ? 'bg-[#00AABB] text-white' 
                    : 'text-gray-700 hover:bg-[#00AABB] hover:text-white'
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className={`ml-3 ${sidebarCollapsed ? 'md:hidden' : ''}`}>Management</span>
                </Link>
              </li>
                )}
             
              
            </ul>

            {/* Bottom navigation items */}
            <ul className="space-y-2 mt-4">
              <li>
                <Link to="/settings" className={`flex items-center px-2 py-2 rounded ${sidebarCollapsed ? 'md:justify-center' : ''} ${
                  isActive('/settings') 
                    ? 'bg-[#00AABB] text-white' 
                    : 'text-gray-700 hover:bg-[#00AABB] hover:text-white'
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className={`ml-3 ${sidebarCollapsed ? 'md:hidden' : ''}`}>Settings</span>
                </Link>
              </li>
             <li>
  <button 
    onClick={handleLogoutClick}
    className={`w-full flex items-center px-2 py-2 rounded ${sidebarCollapsed ? 'md:justify-center' : ''} text-gray-700 hover:bg-[#00AABB] hover:text-white`}
  >
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
    <span className={`ml-3 ${sidebarCollapsed ? 'md:hidden' : ''}`}>Déconnexion</span>
  </button>
</li>
            </ul>
          </nav>
        </aside>

       
      </div>
 {/* Main Content */}
        <main className={`flex-1 ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'} max-w-full mx-auto p-4 transition-all duration-300`}>
          <Outlet /> {/* This renders the child routes */}
        </main>
      
    </div>
  )
}

export default Layout