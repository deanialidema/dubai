"use client"

import { useSessionTracking } from '@/hooks/use-session-tracking'

interface SessionTrackerProps {
  userId?: string
}

export function SessionTracker({ userId }: SessionTrackerProps) {
  useSessionTracking({ 
    userId,
    trackPageChanges: true,
    heartbeatInterval: 5000, // 5 seconds for real-time session tracking
    redirectCheckInterval: 1000 // 1 second for immediate redirects
  })

  return null // This component doesn't render anything
} 