import { useCallback, useEffect, useState } from 'react'
import { createContribution, createRecord, listContributions, listRecords, removeRecord, updateContribution, updateRecord } from '../services/apiClient.js'
import { useSession } from '../context/SessionContext.js'

export function useRecords(entity) {
  const { session } = useSession()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const refresh = useCallback(async () => {
    if (!session) return
    setLoading(true)
    try {
      const next = entity === 'contributions' ? await listContributions() : await listRecords(entity)
      setRecords(next)
      setError(null)
    } catch (nextError) { setError(nextError); throw nextError } finally { setLoading(false) }
  }, [entity, session])
  useEffect(() => { refresh().catch(() => {}) }, [refresh])

  return {
    records,
    loading,
    error,
    create: async (input) => { const record = entity === 'contributions' ? await createContribution(input) : await createRecord(entity, input); await refresh(); return record },
    update: async (id, changes) => { const record = entity === 'contributions' ? await updateContribution(id, changes) : await updateRecord(entity, id, changes); await refresh(); return record },
    remove: async (id) => { const record = await removeRecord(entity, id); await refresh(); return record },
    refresh,
  }
}
