import './globals.css'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
  title: 'FMCG Software — Product Development Platform',
  description: 'Enterprise FMCG product development lifecycle management platform',
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
