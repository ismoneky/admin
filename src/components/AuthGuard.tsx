import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const apiKey = useAuthStore((s) => s.apiKey)
  if (!apiKey) return <Navigate to="/login" replace />
  return <>{children}</>
}
