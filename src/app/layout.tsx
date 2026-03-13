import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'),
  title: { default: 'TodoClick MX — Todo lo que necesitas, a un clic', template: '%s | TodoClick MX' },
  description: 'Tienda online mexicana con los mejores productos al mejor precio. Electrónica, moda, hogar, deportes y más. Envío rápido a toda la República Mexicana. Pago seguro.',
  keywords: ['tienda online mexico','comprar online mexico','productos baratos mexico','envio rapido mexico','TodoClick MX','electronica','moda','hogar'],
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    siteName: 'TodoClick MX',
    title: 'TodoClick MX — Todo lo que necesitas, a un clic',
    description: 'La mejor tienda online de México. Miles de productos con envío rápido.',
  },
  twitter: { card: 'summary_large_image', title: 'TodoClick MX', description: 'Todo lo que necesitas, a un clic 🇲🇽' },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "TodoClick MX",
          "url": process.env.NEXT_PUBLIC_APP_URL,
          "description": "Tienda online mexicana con los mejores productos al mejor precio",
          "potentialAction": {
            "@type": "SearchAction",
            "target": `${process.env.NEXT_PUBLIC_APP_URL}/tienda?q={search_term_string}`,
            "query-input": "required name=search_term_string"
          }
        })}} />
      </head>
      <body>{children}</body>
    </html>
  )
}
