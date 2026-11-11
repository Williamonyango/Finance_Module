import { useEffect, useState } from 'react'
import { getDashboard } from '../services/apiClient'
import { useSession } from '../context/SessionContext'

export function useDashboard() {
  const { session } = useSession()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(Boolean(session))
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!session) return
    let active = true
    setLoading(true)
    getDashboard(session.role)
      .then((data) => { if (active) { setDashboard(data); setError(null) } })
      .catch((nextError) => { if (active) setError(nextError) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [session])

  return { dashboard, loading, error }
}
