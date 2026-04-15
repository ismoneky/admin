import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  apiKey: string | null
  name: string | null
  username: string | null
  setAuth: (apiKey: string, name: string, username: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      apiKey: null,
      name: null,
      username: null,
      setAuth: (apiKey, name, username) => set({ apiKey, name, username }),
      logout: () => set({ apiKey: null, name: null, username: null }),
    }),
    { name: 'admin-auth' }
  )
)
