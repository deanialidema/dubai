import { Suspense } from "react"
import ScheduleCall from "../../schedule-call"

function ScheduleCallFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<ScheduleCallFallback />}>
      <ScheduleCall />
    </Suspense>
  )
}
