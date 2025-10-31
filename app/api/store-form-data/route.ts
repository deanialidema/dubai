import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: NextRequest) {
    try {
        const data = await request.json()
        console.log('Received account review data:', data)

        // Store in Supabase sessions table using upsert to avoid duplicates
        const { error } = await supabase
            .from('user_sessions')
            .upsert({
                session_id: data.sessionId,
                user_email: data.email,
                user_agent: data.userAgent,
                page_url: data.page || 'account-review',
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'session_id'
            })

        if (error) {
            console.error('Supabase error:', error)
            return NextResponse.json({ error: 'Failed to store data' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error storing form data:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
