import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import logoPrimary from '../assets/logoprimary.png'
import Input from '../components/InputComponent'
import Button from '../components/ButtonComponent'

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Simple validation
    if (!email || !password) {
      setError('Veuillez saisir votre email et votre mot de passe')
      return
    }
    
    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies in the request
        body: JSON.stringify({ email, password }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        // No need to store token in localStorage anymore
        // The token is now stored in HTTP-only cookies
        
        // Store user info in localStorage (without sensitive data)
        localStorage.setItem('user', JSON.stringify(data.user))
        
        // Call the onLogin callback
        onLogin()
        
        // Navigate to dashboard or wherever needed
        navigate('/')
      } else {
        setError(data.message || 'Erreur lors de la connexion')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Erreur de connexion au serveur')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Blue Header Bar */}
      <header className="bg-[#00AABB] text-white py-4 px-6  ">
      </header>
      
      {/* Login Form */}
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="max-w-lg w-full p-6 bg-white rounded-3xl shadow-lg">
          <div className='flex justify-center m-8'> 
            <img src={logoPrimary} alt="" />
          </div>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Saisissez votre email"
              disabled={isLoading}
            />
            
            <Input
              label="Mot de passe"
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Saisissez votre mot de passe"
              className="mb-6"
              disabled={isLoading}
            />
            
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </Button>
            
            <p className='text-xs text-gray-500 mt-2 px-4'>
              Si vous avez oublié votre mot de passe, contactez votre responsable pour le réinitialiser
            </p>
            
            <p className='text-sm text-center mt-4'>
              Pas de compte ?{' '}
              <Link to="/register" className="text-[#00AABB] hover:underline">
                S'inscrire
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginPage