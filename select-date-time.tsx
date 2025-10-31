"use client"

export default function SelectDateTime() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      {/* Calendly inline widget */}
      <div
        className="calendly-inline-widget w-full"
        data-url="https://calendly.com/momqillamerita3/new-meeting"
        style={{ minWidth: "320px", height: "700px" }}
      ></div>
      <script
        type="text/javascript"
        src="https://assets.calendly.com/assets/external/widget.js"
        async
      ></script>
    </div>
  )
}
