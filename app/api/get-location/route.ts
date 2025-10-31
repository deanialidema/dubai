import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ip = searchParams.get('ip')
    
    if (!ip || ip === 'unknown') {
      return NextResponse.json({ 
        country: 'Unknown',
        countryCode: 'UN',
        flag: '🏳️'
      })
    }
    
    // Skip localhost/private IPs
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return NextResponse.json({ 
        country: 'Local',
        countryCode: 'LC',
        flag: '🏠'
      })
    }
    
    try {
      // Use ipapi.co for geolocation (free tier: 1000 requests/day)
      const response = await fetch(`https://ipapi.co/${ip}/json/`, {
        headers: {
          'User-Agent': 'Nike Session Tracker'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.country_name && data.country_code) {
          return NextResponse.json({
            country: data.country_name,
            countryCode: data.country_code,
            flag: getCountryFlag(data.country_code),
            city: data.city || undefined,
            region: data.region || undefined
          })
        }
      }
    } catch (error) {
      console.error('Error fetching location from ipapi.co:', error)
    }
    
    // Fallback to ip-api.com (free tier: 1000 requests/hour)
    try {
      const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,regionName`)
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.status === 'success' && data.country && data.countryCode) {
          return NextResponse.json({
            country: data.country,
            countryCode: data.countryCode,
            flag: getCountryFlag(data.countryCode),
            city: data.city || undefined,
            region: data.regionName || undefined
          })
        }
      }
    } catch (error) {
      console.error('Error fetching location from ip-api.com:', error)
    }
    
    // Final fallback
    return NextResponse.json({ 
      country: 'Unknown',
      countryCode: 'UN',
      flag: '🌍'
    })
    
  } catch (error) {
    console.error('Error getting location:', error)
    return NextResponse.json({ 
      country: 'Unknown',
      countryCode: 'UN',
      flag: '🌍'
    }, { status: 500 })
  }
}

// Convert country code to flag emoji
function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌍'
  
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))
  
  return String.fromCodePoint(...codePoints)
} 