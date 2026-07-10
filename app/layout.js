import './globals.css'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
  title: 'Zydus Wellness — Product Development Platform',
  description: 'Enterprise product development lifecycle management for Zydus Wellness FMCG',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
