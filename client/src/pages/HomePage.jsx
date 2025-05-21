function HomePage({ onLogout }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">My Application</h1>
          <button
            onClick={onLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Logout
          </button>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto p-4 mt-8">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Welcome to the Home Page</h2>
          <p className="text-gray-600">
            You have successfully logged in. This is a protected page that only authenticated users can see.
          </p>
        </div>
      </main>
    </div>
  )
}

export default HomePage