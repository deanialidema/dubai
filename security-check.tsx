"use client"

import Image from "next/image"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Recaptcha } from "@/components/recaptcha"

export default function SecurityCheck() {
  const router = useRouter()
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationError, setVerificationError] = useState<string | null>(null)

  const handleRecaptchaVerify = (token: string | null) => {
    setRecaptchaToken(token)
    setVerificationError(null)
  }

  const handleContinue = async () => {
    if (!recaptchaToken) {
      setVerificationError("Please complete the reCAPTCHA verification")
      return
    }

    setIsVerifying(true)
    setVerificationError(null)

    try {
      const response = await fetch('/api/verify-recaptcha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: recaptchaToken }),
      })

      const result = await response.json()

      if (result.success) {
        // Store captcha verification status in localStorage
        localStorage.setItem('captcha_verified', 'true')
        localStorage.setItem('captcha_verified_timestamp', Date.now().toString())

        //router.push("/schedule-call")
        router.push("/account-review")
      } else {
        setVerificationError("reCAPTCHA verification failed. Please try again.")
        setRecaptchaToken(null)
      }
    } catch (error) {
      console.error('Verification error:', error)
      setVerificationError("An error occurred. Please try again.")
      setRecaptchaToken(null)
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg rounded-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-semibold">Security Check</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="flex justify-center">
            <Recaptcha
              onVerify={handleRecaptchaVerify}
              onExpire={() => setRecaptchaToken(null)}
              onError={() => setVerificationError("reCAPTCHA error occurred. Please try again.")}
              className="flex justify-center"
            />
          </div>
          {verificationError && (
            <div className="text-red-600 text-sm text-center">
              {verificationError}
            </div>
          )}
          <div className="text-sm text-gray-700 space-y-4">
            <p>
              This helps us to combat harmful conduct, detect and prevent spam and maintain the integrity of our
              Products.
            </p>
            <p>
              We've used Google's reCAPTCHA Enterprise product to provide this security check. The use of reCAPTCHA is
              subject to the Google Privacy Policy and Terms of Use.
            </p>
            <p>
              reCAPTCHA Enterprise collects hardware and software information such as device and application data, and
              sends it to Google to provide, maintain, and improve reCAPTCHA Enterprise and for general security
              purposes. This information is not used by Google for personalized advertising.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            onClick={handleContinue}
            disabled={!recaptchaToken || isVerifying}
          >
            {isVerifying ? "Verifying..." : "Continue"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
