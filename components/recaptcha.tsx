"use client"

import { useCallback, useRef, useState, useEffect } from 'react'
// @ts-ignore - react-google-recaptcha doesn't have types
import ReCAPTCHA from 'react-google-recaptcha'

// Extend window type to include grecaptcha and Opera detection
declare global {
  interface Window {
    grecaptcha?: {
      render?: (container: any, parameters: any) => void
      reset?: (opt_widget_id?: any) => void
      getResponse?: (opt_widget_id?: any) => string
      ready?: (callback: () => void) => void
    }
    opr?: {
      addons?: any
    }
    opera?: any
  }
}

interface RecaptchaProps {
  onVerify: (token: string | null) => void
  onExpire?: () => void
  onError?: () => void
  className?: string
  size?: 'compact' | 'normal' | 'invisible'
  theme?: 'light' | 'dark'
}

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "6Ld42egrAAAAAGn7KlYfvwYT6IhQ2JD8O9ft3SJ4"
const DISABLE_RECAPTCHA = process.env.NEXT_PUBLIC_DISABLE_RECAPTCHA === 'true'

// Hook to check if reCAPTCHA is loaded
function useRecaptchaLoaded() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    // Check if grecaptcha is already loaded
    if (typeof window !== 'undefined' && window.grecaptcha?.render) {
      setIsLoaded(true)
      return
    }

    let timeoutId: NodeJS.Timeout
    let attempts = 0
    const maxAttempts = 50 // Increased attempts for Opera browser - 50 attempts * 200ms = 10 seconds max wait

    const checkRecaptcha = () => {
      attempts++

      if (typeof window !== 'undefined' && window.grecaptcha?.render) {
        console.log('reCAPTCHA loaded successfully after', attempts, 'attempts')
        setIsLoaded(true)
        return
      }

      // Log every 10 attempts for debugging
      if (attempts % 10 === 0) {
        console.log('reCAPTCHA loading attempt', attempts, '- grecaptcha available:', !!window.grecaptcha)
      }

      if (attempts >= maxAttempts) {
        console.error('reCAPTCHA failed to load within timeout after', attempts, 'attempts')
        // For Opera compatibility, try to force load the script again
        if (typeof window !== 'undefined') {
          const existingScript = document.querySelector('script[src*="recaptcha"]')
          if (!existingScript) {
            console.log('Attempting to reload reCAPTCHA script for Opera compatibility')
            const script = document.createElement('script')
            script.src = 'https://www.google.com/recaptcha/api.js?render=explicit'
            script.async = true
            script.defer = true
            script.onload = () => {
              console.log('reCAPTCHA script reloaded')
              // Give it a moment to initialize
              setTimeout(() => {
                if (window.grecaptcha?.render) {
                  setIsLoaded(true)
                } else {
                  setIsError(true)
                }
              }, 500)
            }
            script.onerror = () => {
              console.error('Failed to reload reCAPTCHA script')
              setIsError(true)
            }
            document.head.appendChild(script)
            return
          }
        }
        setIsError(true)
        return
      }

      timeoutId = setTimeout(checkRecaptcha, 200) // Increased interval for stability
    }

    // Start checking
    checkRecaptcha()

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [])

  return { isLoaded, isError }
}

export function Recaptcha({
  onVerify,
  onExpire,
  onError,
  className,
  size = 'normal',
  theme = 'light'
}: RecaptchaProps) {
  const recaptchaRef = useRef<ReCAPTCHA>(null)
  const { isLoaded, isError } = useRecaptchaLoaded()

  // Detect Opera browser for debugging
  const isOpera = typeof window !== 'undefined' && (
    (!!window.opr && !!window.opr.addons) ||
    !!window.opera ||
    navigator.userAgent.indexOf(' OPR/') >= 0
  )

  useEffect(() => {
    if (isOpera) {
      console.log('Opera browser detected - enhanced reCAPTCHA loading enabled')
    }
  }, [isOpera])

  // Auto-verify in dev mode when reCAPTCHA is disabled
  useEffect(() => {
    if (DISABLE_RECAPTCHA) {
      console.log('reCAPTCHA disabled for development - auto-verifying')
      onVerify('dev-mode-bypass-token')
    }
  }, [onVerify])

  const handleChange = useCallback((token: string | null) => {
    onVerify(token)
  }, [onVerify])

  const handleExpire = useCallback(() => {
    onExpire?.()
  }, [onExpire])

  const handleError = useCallback(() => {
    onError?.()
  }, [onError])

  const reset = useCallback(() => {
    recaptchaRef.current?.reset()
  }, [])

  // Show dev mode message when reCAPTCHA is disabled
  if (DISABLE_RECAPTCHA) {
    return (
      <div className={className}>
        <div className="border border-yellow-300 bg-yellow-50 text-yellow-800 px-4 py-3 rounded">
          <p className="text-sm font-medium">🛠️ Development Mode</p>
          <p className="text-xs mt-1">reCAPTCHA is disabled - auto-verified</p>
        </div>
      </div>
    )
  }

  if (!RECAPTCHA_SITE_KEY) {
    return (
      <div className={className}>
        <div className="border border-red-300 bg-red-50 text-red-700 px-4 py-3 rounded">
          <p className="text-sm">reCAPTCHA configuration error: Site key not found</p>
          <p className="text-xs mt-1">Please check your environment variables</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className={className}>
        <div className="border border-red-300 bg-red-50 text-red-700 px-4 py-3 rounded">
          <p className="text-sm">reCAPTCHA failed to load</p>
          <p className="text-xs mt-1">
            {isOpera
              ? "Opera browser detected. Please ensure JavaScript is enabled and try refreshing the page. You may also try disabling ad blockers temporarily."
              : "Please refresh the page and try again. If you're using an ad blocker, please disable it for this site."
            }
          </p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className={className}>
        <div className="border border-gray-300 bg-gray-50 text-gray-700 px-4 py-3 rounded">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
            <p className="text-sm">
              Loading reCAPTCHA...
              {isOpera && " (Opera browser detected - this may take a moment)"}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <ReCAPTCHA
        ref={recaptchaRef}
        sitekey={RECAPTCHA_SITE_KEY}
        onChange={handleChange}
        onExpired={handleExpire}
        onError={handleError}
        size={size}
        theme={theme}
      />
    </div>
  )
}

export { type RecaptchaProps } 
