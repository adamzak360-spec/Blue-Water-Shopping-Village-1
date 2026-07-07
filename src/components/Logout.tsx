import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function LogoutButton() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    const { error } = await signOut()
    if (error) {
      console.error('Logout error:', error)
    }
    navigate('/login', { replace: true })
  }

  return (
    <button onClick={handleLogout} className="logout-button" title="Sign out">
      Sign Out
    </button>
  )
}
