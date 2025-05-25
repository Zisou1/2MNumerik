import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import logoPrimary from '../assets/logoprimary.png'

function Layout({ onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  return (
    <div className="min-h-screen bg-gray-100">
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
          <button
            onClick={onLogout}
            className="bg-[#00AABB] hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Logout
          </button>
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
              <a href="#" className="hidden md:flex justify-center">
                <img 
                  src={logoPrimary} 
                  alt="" 
                  className={`${sidebarCollapsed ? 'md:w-8 md:h-4' : 'md:w-32 md:h-16'} w-32 h-16 transition-all duration-300`}
                />
              </a>
              
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
                <a href="/" className={`flex items-center px-2 py-2 rounded ${sidebarCollapsed ? 'md:justify-center' : ''} ${
                  isActive('/') 
                    ? 'bg-[#00AABB] text-white' 
                    : 'text-gray-700 hover:bg-[#00AABB] hover:text-white'
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21l4-4 4 4" />
                  </svg>
                  <span className={`ml-3 ${sidebarCollapsed ? 'md:hidden' : ''}`}>Dashboard</span>
                </a>
              </li>
              <li>
                <a href="/profile" className={`flex items-center px-2 py-2 rounded ${sidebarCollapsed ? 'md:justify-center' : ''} ${
                  isActive('/profile') 
                    ? 'bg-[#00AABB] text-white' 
                    : 'text-gray-700 hover:bg-[#00AABB] hover:text-white'
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className={`ml-3 ${sidebarCollapsed ? 'md:hidden' : ''}`}>Profile</span>
                </a>
              </li>
              <li>
                <a href="/settings" className={`flex items-center px-2 py-2 rounded ${sidebarCollapsed ? 'md:justify-center' : ''} ${
                  isActive('/settings') 
                    ? 'bg-[#00AABB] text-white' 
                    : 'text-gray-700 hover:bg-[#00AABB] hover:text-white'
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className={`ml-3 ${sidebarCollapsed ? 'md:hidden' : ''}`}>Settings</span>
                </a>
              </li>
            </ul>

            {/* Bottom navigation items */}
            <ul className="space-y-2 mt-4">
              <li>
                <a href="/help" className={`flex items-center px-2 py-2 rounded ${sidebarCollapsed ? 'md:justify-center' : ''} ${
                  isActive('/help') 
                    ? 'bg-[#00AABB] text-white' 
                    : 'text-gray-700 hover:bg-[#00AABB] hover:text-white'
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className={`ml-3 ${sidebarCollapsed ? 'md:hidden' : ''}`}>Help</span>
                </a>
              </li>
              <li>
                <a href="/about" className={`flex items-center px-2 py-2 rounded ${sidebarCollapsed ? 'md:justify-center' : ''} ${
                  isActive('/about') 
                    ? 'bg-[#00AABB] text-white' 
                    : 'text-gray-700 hover:bg-[#00AABB] hover:text-white'
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className={`ml-3 ${sidebarCollapsed ? 'md:hidden' : ''}`}>About</span>
                </a>
              </li>
            </ul>
          </nav>
        </aside>

       
      </div>
 {/* Main Content */}
        <main className={`flex-1 ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'} max-w-7xl mx-auto p-4 transition-all duration-300`}>
          <Outlet /> {/* This renders the child routes */}
        </main>
      
    </div>
  )
}

export default Layout