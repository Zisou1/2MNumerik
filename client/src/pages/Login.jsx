import { useState } from 'react'
import logoPrimary from '../assets/logoprimary.png'
import Input from '../components/InputComponent'
import Button from '../components/ButtonComponent'

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Simple validation
    if (!username || !password) {
      setError('Veuillez saisir votre nom d\'utilisateur et votre mot de passe')
      return
    }
    
    // Here you would typically make an API call to verify credentials
    // For this example, we'll just simulate a successful login
    if (username === 'user' && password === 'password') {
      onLogin()
    } else {
      setError('Nom d\'utilisateur ou mot de passe invalide')
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
              label="Nom d'utilisateur"
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Saisissez votre nom d'utilisateur"
            />
            
            <Input
              label="Mot de passe"
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Saisissez votre mot de passe"
              className="mb-6"
            />
            
            <Button type="submit">
              Se connecter
            </Button>
            
            <p className='text-xs text-gray-500 mt-2 px-4'>
              Si vous avez oublié votre mot de passe, contactez votre responsable pour le réinitialiser
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginPage