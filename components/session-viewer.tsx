"use client"

import { useState, useEffect } from 'react'
import { getActiveSessions } from '@/lib/session-tracking'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Users, Globe, Clock } from 'lucide-react'

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
  country?: string
  country_code?: string
  flag?: string
  city?: string
  region?: string

}

export function SessionViewer() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSessions = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await getActiveSessions()
      if (result.success && result.data) {
        setSessions(result.data)
      } else {
        setError('Failed to fetch sessions')
      }
    } catch (err) {
      setError('Error fetching sessions')
      console.error('Error fetching sessions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSessions, 30000)
    return () => clearInterval(interval)
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

  const getBrowserName = (userAgent?: string) => {
    if (!userAgent) return 'Unknown'
    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'
    return 'Other'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Active Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading sessions...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Active Sessions
            <Badge variant="secondary">{sessions.length}</Badge>
          </CardTitle>
          <Button 
            onClick={fetchSessions} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-red-500 text-sm mb-4">
            {error}
          </div>
        )}
        
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No active sessions found
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div key={session.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-sm truncate max-w-md">
                      {session.page_url}
                    </span>
                  </div>
                  <Badge variant={session.is_active ? "default" : "secondary"}>
                    {session.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
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
                
                {session.user_id && (
                  <div className="text-sm">
                    <span className="font-medium">User ID:</span> {session.user_id}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 