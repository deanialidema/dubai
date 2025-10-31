"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lock, Eye, EyeOff } from 'lucide-react'

interface PasswordProtectionProps {
  children: React.ReactNodex
  requiredPassword?: string
}

const DEFAULT_PASSWORD = "eminem"

export function PasswordProtection({ 
  children, 
  requiredPassword = DEFAULT_PASSWORD 
}: PasswordProtectionProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)

  useEffect(() => {
    // Check if user is already authenticated (using sessionStorage)
    const isAuth = sessionStorage.getItem('panel_authenticated') === 'true'
    setIsAuthenticated(isAuth)
    setIsLoading(false)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (isLocked) {
      setError('Too many failed attempts. Please wait before trying again.')
      return
    }

    if (password === requiredPassword) {
      setIsAuthenticated(true)
      sessionStorage.setItem('panel_authenticated', 'true')
      setFailedAttempts(0)
    } else {
      const newFailedAttempts = failedAttempts + 1
      setFailedAttempts(newFailedAttempts)
      setError(`Incorrect password. Please try again. (${newFailedAttempts}/3 attempts)`)
      setPassword('')

      // Lock after 3 failed attempts
      if (newFailedAttempts >= 3) {
        setIsLocked(true)
        setError('Too many failed attempts. Access locked for 30 seconds.')
        
        // Unlock after 30 seconds
        setTimeout(() => {
          setIsLocked(false)
          setFailedAttempts(0)
          setError('')
        }, 30000)
      }
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    sessionStorage.removeItem('panel_authenticated')
    setPassword('')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Lock className="w-12 h-12 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Access Restricted</CardTitle>
            <p className="text-gray-600 mt-2">
              Please enter the password to access the admin panel
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <Button 
                type="submit" 
                className="w-full disabled:opacity-50" 
                disabled={!password.trim() || isLocked}
              >
                {isLocked ? 'Access Locked' : 'Access Panel'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Logout button */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          onClick={handleLogout}
          variant="outline"
          size="sm"
          className="bg-white shadow-md hover:bg-gray-50"
        >
          <Lock className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
      
      {children}
    </div>
  )
} 
