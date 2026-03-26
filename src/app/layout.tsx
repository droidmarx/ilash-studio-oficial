
import type {Metadata, Viewport} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'I Lash Studio | Luxury Agenda',
  description: 'Sistema de agendamento premium para Lash Designers',
  manifest: '/manifest.json',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23b76e79%22 stroke-width=%221.2%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22M2 10s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z%22/><path d=%22M6 4L5 1.5%22/><path d=%22M10 3L10 0%22/><path d=%22M14 3L14 0%22/><path d=%22M18 4L19 1.5%22/><circle cx=%2212%22 cy=%2210%22 r=%223%22/></svg>',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'I Lash Studio',
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { AuthProvider } from '@/components/auth/AuthContext';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Great+Vibes&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="font-body antialiased bg-background text-foreground min-h-screen selection:bg-primary/30 transition-colors duration-500 overflow-x-hidden">
        <AuthProvider>
          <div className="sparkle-bg">
            {/* Purpurina Temática (Glitter) Flutuante */}
            {[...Array(120)].map((_, i) => {
              const size = Math.random() * 5 + 1;
              const delay = Math.random() * 20;
              const duration = 10 + Math.random() * 15;
              const left = Math.random() * 100;
              
              return (
                <div 
                  key={`sparkle-${i}`} 
                  className="sparkle bg-gold-gradient" 
                  style={{
                    left: `${left}%`,
                    animationDelay: `${delay}s`,
                    animationDuration: `${duration}s`,
                    width: `${size}px`,
                    height: `${size}px`,
                    opacity: 0.4 + Math.random() * 0.6
                  }}
                />
              );
            })}

            {/* Estrelas Cadentes Discretas */}
            {[...Array(6)].map((_, i) => (
              <div 
                key={`star-${i}`}
                className="shooting-star"
                style={{
                  top: `${Math.random() * 50}%`,
                  animationDelay: `${i * 8 + Math.random() * 10}s`,
                  animationDuration: `${12 + Math.random() * 10}s`
                }}
              />
            ))}
          </div>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
