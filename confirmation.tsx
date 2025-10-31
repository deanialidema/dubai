"use client"

import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, User, Calendar, Globe } from "lucide-react"

export default function Confirmation() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-2xl shadow-lg rounded-lg overflow-hidden relative p-8 flex flex-col items-center">
        {/* Calendly Ribbon */}
        <div className="absolute top-4 right-0 bg-gray-800 text-white text-xs px-4 py-1 transform rotate-45 translate-x-1/4 -translate-y-1/4 origin-top-right shadow-md">
          Powered by Calendly
        </div>

        <div className="flex flex-col items-center text-center mb-8 mt-4">
          <Image src="/zara.jpeg" alt="Zara logo" width={80} height={29} className="mb-6" />
          <div className="flex items-center gap-2 text-green-600 text-2xl font-semibold mb-2">
            <CheckCircle className="w-7 h-7" />
            <span>You are scheduled</span>
          </div>
          <p className="text-gray-700 text-base">A calendar invitation has been sent to your email address.</p>
        </div>

        <CardContent className="w-full max-w-md p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Meeting</h2>
          <div className="space-y-3 text-gray-700">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-gray-500" />
              <span>Zara</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <span>3:30pm - 4:00pm, Thursday, July 10, 2025</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-gray-500" />
              <span>Central European Time</span>
            </div>
          </div>
        </CardContent>

        <div className="absolute bottom-4 left-4 text-sm text-blue-600">
          <a href="#" className="hover:underline">
            Cookie settings
          </a>
        </div>
      </Card>
    </div>
  )
}
