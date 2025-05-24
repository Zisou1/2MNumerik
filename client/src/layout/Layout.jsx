import { useState } from 'react'
import { Outlet } from 'react-router-dom'

function Layout({ onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow-md p-4 fixed top-0 left-0 right-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mr-4 p-2 rounded-md hover:bg-gray-200 md:hidden"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-800">My Application</h1>
          </div>
          <button
            onClick={onLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside className={`bg-white shadow-md w-64 fixed left-0 top-16 bottom-0 z-30 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}>
          <nav className="p-4">
            <ul className="space-y-2">
              <li>
                <a href="/" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
                  Dashboard
                </a>
              </li>
              <li>
                <a href="#" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
                  Profile
                </a>
              </li>
              <li>
                <a href="#" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
                  Settings
                </a>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:ml-64 max-w-7xl mx-auto p-4">
          <Outlet /> {/* This renders the child routes */}
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  )
}

export default Layout