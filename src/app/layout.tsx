import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'),
  title: { default: 'DropShip Pro — Tienda Online México', template: '%s | DropShip Pro' },
  description: 'Compra online los mejores productos: electrónica, moda, hogar y más. Envío rápido a todo México. Pago seguro con tarjeta, OXXO y transferencia.',
  keywords: ['tienda online mexico','dropshipping mexico','comprar online','envio rapido mexico','productos baratos'],
  robots: { index: true, follow: true },
  openGraph: { type: 'website', locale: 'es_MX', siteName: 'DropShip Pro' },
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
          "name": "DropShip Pro",
          "url": process.env.NEXT_PUBLIC_APP_URL,
          "potentialAction": { "@type": "SearchAction", "target": `${process.env.NEXT_PUBLIC_APP_URL}/tienda?q={search_term_string}`, "query-input": "required name=search_term_string" }
        })}} />
      </head>
      <body>{children}</body>
    </html>
  )
}
