import type { Metadata, Viewport } from 'next'
import { Inter } from "next/font/google";
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryProvider } from '@/components/providers/QueryProvider';
import "./globals.css";
import Script from 'next/script'

export const metadata: Metadata = {
  title: 'IT Panel - Admin Dashboard',
  description: 'Administrative panel for college management system',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'IT Panel Admin',
  },
  formatDetection: {
    telephone: false,
  },
  themeColor: '#2563eb',
  icons: {
    icon: [{ url: '/icons/android-launchericon.png' }],
    apple: [{ url: '/icons/android-launchericon.png' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563eb',
}

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="IT Panel" />
      </head>
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryProvider>
        <Script
          id="register-sw"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful');
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
