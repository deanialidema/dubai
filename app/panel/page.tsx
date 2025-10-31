import { AdminSessionViewer } from '@/components/admin-session-viewer'
import { PasswordProtection } from '@/components/password-protection'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Database } from 'lucide-react'

export default function PanelPage() {
  return (
    <PasswordProtection>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-2">
              <Database className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
                <p className="text-gray-600">Monitor and manage website sessions</p>
              </div>
            </div>
          </div>

          {/* Sessions Dashboard */}
          <AdminSessionViewer />

          {/* Additional Info */}
          <Card>
            <CardHeader>
              <CardTitle>About Session Tracking</CardTitle>
              <CardDescription>
                This panel shows real-time data from your Supabase database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• Sessions are automatically tracked when users visit your website</p>
                <p>• Active sessions update every 30 seconds</p>
                <p>• Sessions are marked inactive when users leave or close the tab</p>
                <p>• Data refreshes automatically every 30 seconds</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PasswordProtection>
  )
} 