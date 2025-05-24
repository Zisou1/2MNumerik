function HomePage() {
  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Welcome to the Home Page</h2>
      <p className="text-gray-600">
        You have successfully logged in. This is a protected page that only authenticated users can see.
      </p>
    </div>
  )
}

export default HomePage