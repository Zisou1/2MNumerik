import { useAuth } from '../contexts/AuthContext'

function HomePage() {
  const { user } = useAuth()

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Welcome to the Home Page
      </h2>
      <p className="text-gray-600 mb-4">
        You have successfully logged in. This is a protected page that only authenticated users can see.
      </p>
      
      {user && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">User Information</h3>
          <div className="space-y-1">
            <p><span className="font-medium">Username:</span> {user.username} </p>
            <p><span className="font-medium">Email:</span> {user.email}</p>
            <p><span className="font-medium">User ID:</span> {user.id}</p>
            <p><span className="font-medium">Account created:</span> {new Date(user.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default HomePage