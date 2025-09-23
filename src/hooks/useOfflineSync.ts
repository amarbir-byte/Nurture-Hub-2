import { useState, useEffect, useCallback } from 'react'

interface OfflineAction {
  id: string
  type: 'create' | 'update' | 'delete'
  table: string
  data: Record<string, unknown>
  timestamp: number
}

const OFFLINE_STORAGE_KEY = 'nurture_hub_offline_actions'

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Load pending actions from localStorage
    const stored = localStorage.getItem(OFFLINE_STORAGE_KEY)
    if (stored) {
      try {
        setPendingActions(JSON.parse(stored))
      } catch (error) {
        console.error('Error loading offline actions:', error)
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(pendingActions))
  }, [pendingActions])

  const addOfflineAction = useCallback((action: Omit<OfflineAction, 'id' | 'timestamp'>) => {
    const newAction: OfflineAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    }
    setPendingActions(prev => [...prev, newAction])
  }, [])

  const removeOfflineAction = useCallback((actionId: string) => {
    setPendingActions(prev => prev.filter(action => action.id !== actionId))
  }, [])

  const clearAllOfflineActions = useCallback(() => {
    setPendingActions([])
    localStorage.removeItem(OFFLINE_STORAGE_KEY)
  }, [])

  const syncPendingActions = useCallback(async () => {
    if (!isOnline || pendingActions.length === 0) return

    const supabase = (await import('../lib/supabase')).supabase
    const failedActions: OfflineAction[] = []

    for (const action of pendingActions) {
      try {
        switch (action.type) {
          case 'create':
            await supabase.from(action.table).insert(action.data)
            break
          case 'update':
            await supabase.from(action.table).update(action.data).eq('id', action.data.id)
            break
          case 'delete':
            await supabase.from(action.table).delete().eq('id', action.data.id)
            break
        }
      } catch (error) {
        console.error(`Failed to sync action ${action.id}:`, error)
        failedActions.push(action)
      }
    }

    setPendingActions(failedActions)

    if (failedActions.length === 0) {
      localStorage.removeItem(OFFLINE_STORAGE_KEY)
    }
  }, [isOnline, pendingActions])

  useEffect(() => {
    if (isOnline && pendingActions.length > 0) {
      syncPendingActions()
    }
  }, [isOnline, pendingActions.length, syncPendingActions])

  return {
    isOnline,
    pendingActions,
    addOfflineAction,
    removeOfflineAction,
    clearAllOfflineActions,
    syncPendingActions,
    hasPendingActions: pendingActions.length > 0
  }
}