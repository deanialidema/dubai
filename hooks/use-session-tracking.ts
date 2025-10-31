import { useEffect, useRef, useCallback } from 'react'
import { trackSession, endSession, checkAndClearRedirection, getOrCreateSessionId } from '@/lib/session-tracking'
import { useRouter } from 'next/navigation'

interface UseSessionTrackingOptions {
  userId?: string
  trackPageChanges?: boolean
  heartbeatInterval?: number // in milliseconds
  redirectCheckInterval?: number // in milliseconds for checking redirects more frequently
}

export function useSessionTracking(options: UseSessionTrackingOptions = {}) {
  const {
    userId,
    trackPageChanges = true,
    heartbeatInterval = 5000, // 5 seconds for real-time session tracking
    redirectCheckInterval = 1000 // 1 second for redirect checking - ensures immediate redirects
  } = options

  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)
  const redirectCheckRef = useRef<NodeJS.Timeout | null>(null)
  const isTrackingRef = useRef(false)
  const hasInitializedRef = useRef(false) // Prevent React Strict Mode double initialization
  const router = useRouter()

  // Function to immediately check for redirects
  const checkRedirectImmediately = useCallback(async () => {
    try {
      const redirectResult = await checkAndClearRedirection()
      if (redirectResult.success && redirectResult.redirectTo) {
        // Dispatch event to close all dialogs before redirecting
        window.dispatchEvent(new CustomEvent('admin-redirect-happening', { 
          detail: { redirectTo: redirectResult.redirectTo } 
        }))
        
        // Small delay to allow dialogs to close before navigation
        await new Promise(resolve => setTimeout(resolve, 50))
        
        router.push(redirectResult.redirectTo)
        return true
      }
      return false
    } catch (error) {
      console.warn('Immediate redirect check failed:', error)
      return false
    }
  }, [router])

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (hasInitializedRef.current) {
      console.log('Session tracking already initialized, skipping duplicate initialization')
      return
    }
    hasInitializedRef.current = true

    // Start tracking session when component mounts
    const startTracking = async () => {
      if (isTrackingRef.current) {
        console.log('Session tracking already in progress, skipping')
        return
      }
      
      isTrackingRef.current = true
      console.log('Starting session tracking initialization...')
      
      // Initial session track with retry logic
      const attemptSessionTracking = async (attempt = 1, maxAttempts = 3) => {
        try {
          console.log(`Session tracking attempt ${attempt}/${maxAttempts}`)
          const result = await trackSession({ userId })
          
          if (result.success) {
            console.log('Session tracking successful')
            return true
          } else {
            console.warn(`Session tracking failed (attempt ${attempt}):`, result.error)
            
            if (attempt < maxAttempts) {
              console.log(`Retrying in ${attempt * 1000}ms...`)
              await new Promise(resolve => setTimeout(resolve, attempt * 1000))
              return attemptSessionTracking(attempt + 1, maxAttempts)
            } else {
              console.error('Session tracking failed after all attempts')
              return false
            }
          }
        } catch (error) {
          console.warn(`Session tracking attempt ${attempt} threw error:`, error)
          
          if (attempt < maxAttempts) {
            console.log(`Retrying in ${attempt * 1000}ms...`)
            await new Promise(resolve => setTimeout(resolve, attempt * 1000))
            return attemptSessionTracking(attempt + 1, maxAttempts)
          } else {
            console.error('Session tracking failed after all attempts due to exceptions')
            return false
          }
        }
      }

      await attemptSessionTracking()

      // Initial redirect check
      await checkRedirectImmediately()

      // Set up heartbeat to keep session alive
      if (heartbeatInterval > 0) {
        heartbeatRef.current = setInterval(async () => {
          try {
            await trackSession({ userId })
          } catch (error) {
            console.warn('Session tracking heartbeat failed:', error)
          }
        }, heartbeatInterval)
      }

      // Set up frequent redirect checking for immediate redirects
      if (redirectCheckInterval > 0) {
        redirectCheckRef.current = setInterval(async () => {
          await checkRedirectImmediately()
        }, redirectCheckInterval)
      }
    }

    startTracking()

    // Listen for immediate redirect events
    const handleRedirectEvent = async (event: Event) => {
      if (event instanceof CustomEvent && event.detail) {
        const { sessionId } = event.detail
        const currentSessionId = getOrCreateSessionId()
        
        // Only trigger redirect check if it's for the current session
        if (sessionId === currentSessionId) {
          await checkRedirectImmediately()
        }
      }
    }

    // Track page visibility changes
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // Page is hidden (tab switch, minimize, etc.) - pause tracking but keep session active
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current)
          heartbeatRef.current = null
        }
        if (redirectCheckRef.current) {
          clearInterval(redirectCheckRef.current)
          redirectCheckRef.current = null
        }
        // Don't mark as inactive - user might come back
        console.log('Page hidden - pausing tracking but keeping session active')
      } else {
        // Page is visible again, resume tracking and mark as active
        try {
          await trackSession({ userId }) // This will set is_active: true
          
          // Check for redirection commands when page becomes visible
          await checkRedirectImmediately()
          console.log('Page visible - resumed tracking and marked session active')
        } catch (error) {
          console.warn('Session tracking visibility change failed:', error)
        }
        
        // Resume heartbeat for session tracking
        if (heartbeatInterval > 0 && !heartbeatRef.current) {
          heartbeatRef.current = setInterval(async () => {
            try {
              await trackSession({ userId })
            } catch (error) {
              console.warn('Session tracking heartbeat failed:', error)
            }
          }, heartbeatInterval)
        }

        // Resume redirect checking
        if (redirectCheckInterval > 0 && !redirectCheckRef.current) {
          redirectCheckRef.current = setInterval(async () => {
            await checkRedirectImmediately()
          }, redirectCheckInterval)
        }
      }
    }

    // Track before page unload - only mark inactive on actual page unload
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Only end session on actual page unload, not on refresh or internal navigation
      if (event.type === 'beforeunload') {
        endSession() // Don't await as page is unloading
      }
    }

    // Track user activity for real-time updates
    const handleUserActivity = async () => {
      try {
        console.log('🎯 User activity detected - updating session')
        await trackSession({ userId })
      } catch (error) {
        console.warn('Activity-based session tracking failed:', error)
      }
    }

    // Add activity listeners for immediate updates
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    let activityThrottleTimer: NodeJS.Timeout | null = null
    
    const throttledActivityHandler = () => {
      if (activityThrottleTimer) return
      activityThrottleTimer = setTimeout(() => {
        handleUserActivity()
        activityThrottleTimer = null
      }, 1000) // Throttle to every 1 second for more responsive updates
    }

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('session-redirect-set', handleRedirectEvent)
    
    // Add activity listeners for real-time tracking
    activityEvents.forEach(event => {
      document.addEventListener(event, throttledActivityHandler, { passive: true })
    })

    // Cleanup function
    return () => {
      console.log('Cleaning up session tracking...')
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
      }
      if (redirectCheckRef.current) {
        clearInterval(redirectCheckRef.current)
      }
      
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('session-redirect-set', handleRedirectEvent)
      
      // Remove activity listeners
      activityEvents.forEach(event => {
        document.removeEventListener(event, throttledActivityHandler)
      })
      
      // Clear activity throttle timer
      if (activityThrottleTimer) {
        clearTimeout(activityThrottleTimer)
      }
      
      // Only end session if the page is actually being unloaded
      // Don't end session on React re-renders or component remounts
      if (document.visibilityState === 'hidden' || window.closed) {
        endSession()
      }
      isTrackingRef.current = false
      hasInitializedRef.current = false // Allow re-initialization if component remounts
    }
  }, [userId, heartbeatInterval, redirectCheckInterval, checkRedirectImmediately])

  // Track page changes in SPA
  useEffect(() => {
    if (!trackPageChanges) return

    const trackPageChange = async () => {
      try {
        await trackSession({ userId })
        
        // Also check for redirects on page changes
        await checkRedirectImmediately()
      } catch (error) {
        console.warn('Session tracking page change failed:', error)
      }
    }

    // Track initial page load
    trackPageChange()

    // Track route changes (for Next.js router)
    if (typeof window !== 'undefined' && window.history) {
      const originalPushState = window.history.pushState
      const originalReplaceState = window.history.replaceState

      window.history.pushState = function(...args) {
        originalPushState.apply(window.history, args)
        trackPageChange()
      }

      window.history.replaceState = function(...args) {
        originalReplaceState.apply(window.history, args)
        trackPageChange()
      }

      window.addEventListener('popstate', trackPageChange)

      return () => {
        window.history.pushState = originalPushState
        window.history.replaceState = originalReplaceState
        window.removeEventListener('popstate', trackPageChange)
      }
    }
  }, [trackPageChanges, userId, checkRedirectImmediately])

  return {
    checkRedirectImmediately
  }
} 