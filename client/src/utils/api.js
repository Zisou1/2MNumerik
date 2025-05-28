// Utility functions for API calls with HTTP-only cookies

const API_BASE_URL = 'http://localhost:3001/api'

// Generic API call function that includes credentials
export const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`
  
  const defaultOptions = {
    credentials: 'include', // Always include cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }

  const response = await fetch(url, { ...defaultOptions, ...options })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

// Authentication API calls
export const authAPI = {
  login: (credentials) => apiCall('/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),

  register: (userData) => apiCall('/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),

  logout: () => apiCall('/logout', {
    method: 'POST',
  }),

  getProfile: () => apiCall('/profile'),
}

// User API calls
export const userAPI = {
  getUsers: () => apiCall('/users'),
  
  getUser: (id) => apiCall(`/users/${id}`),
  
  updateProfile: (userData) => apiCall('/users/profile', {
    method: 'PUT',
    body: JSON.stringify(userData),
  }),
  
  deleteAccount: () => apiCall('/users/account', {
    method: 'DELETE',
  }),
}

export default { apiCall, authAPI, userAPI }
