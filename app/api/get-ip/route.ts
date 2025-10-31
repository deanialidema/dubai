import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Try to get IP from various headers (in order of preference)
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const cfConnectingIp = request.headers.get('cf-connecting-ip')
    const clientIp = request.headers.get('x-client-ip')
    const forwardedProto = request.headers.get('x-forwarded-proto')
    
    let ip = 'unknown'
    
    if (forwarded) {
      // x-forwarded-for can contain multiple IPs, get the first one (client IP)
      ip = forwarded.split(',')[0].trim()
    } else if (realIp) {
      ip = realIp
    } else if (cfConnectingIp) {
      ip = cfConnectingIp
    } else if (clientIp) {
      ip = clientIp
    }
    
    // Validate IP format (basic check)
    if (ip !== 'unknown' && ip) {
      // Remove any port numbers
      ip = ip.split(':')[0]
      
      // Basic IP validation (IPv4 or IPv6)
      const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
      const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
      
      if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
        ip = 'unknown'
      }
    }
    
    return NextResponse.json({ 
      ip,
      headers: {
        'x-forwarded-for': forwarded,
        'x-real-ip': realIp,
        'cf-connecting-ip': cfConnectingIp,
        'x-client-ip': clientIp
      }
    })
  } catch (error) {
    console.error('Error getting IP:', error)
    return NextResponse.json({ ip: 'unknown' }, { status: 500 })
  }
} 