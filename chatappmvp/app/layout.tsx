import type { Metadata } from 'next'
import { Geist, Azeret_Mono as Geist_Mono } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { RootLayout } from '@/components/layout/RootLayout'
import '@/app/globals.css'

// Define fonts for consistent typography
const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
})
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Minimalist Threaded Chat App',
  description: 'A Bauhaus-inspired, distraction-free chat application',
}

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full">
        <body
          className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased h-full`}
        >
          <RootLayout>{children}</RootLayout>
        </body>
      </html>
    </ClerkProvider>
  )
}

