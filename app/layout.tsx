import type { Metadata } from 'next'
import './globals.css'
import { SessionTracker } from '@/components/session-tracker'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'Adecco Careers',
  description: 'Adecco Career Portal',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-video-preview': -1,
      'max-image-preview': 'none',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex, nocache" />
        <meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
        <meta name="bingbot" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
        <meta name="slurp" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
        <meta name="duckduckbot" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
        <meta name="referrer" content="no-referrer" />
        <meta name="format-detection" content="telephone=no" />
        <meta property="og:robots" content="noindex, nofollow" />
        <meta name="twitter:robots" content="noindex, nofollow" />
        {/* Load reCAPTCHA script in head for better browser compatibility */}
        <script
          src="https://www.google.com/recaptcha/api.js?render=explicit"
          async
          defer
        ></script>
      </head>
      <body>
        <SessionTracker />
        {children}
        <Toaster />
      </body>
    </html>
  )
}
