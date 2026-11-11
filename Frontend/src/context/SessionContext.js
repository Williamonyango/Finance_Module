import { createContext, createElement, useContext, useEffect, useMemo, useState } from 'react'
import { getCurrentUser, login, logout } from '../services/apiClient'

export const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCurrentUser().then(setSession).catch(() => setSession(null)).finally(() => setLoading(false))
    const handleExpired = () => setSession(null)
    window.addEventListener('finance:session-expired', handleExpired)
    return () => window.removeEventListener('finance:session-expired', handleExpired)
  }, [])

  const value = useMemo(() => ({
    session,
    loading,
    signIn: (email, password) => login(email, password).then((user) => { setSession(user); return user }),
    signOut: () => logout().finally(() => setSession(null)),
  }), [session, loading])
  return createElement(SessionContext.Provider, { value }, children)
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) throw new Error('useSession must be used within SessionProvider')
  return context
}
