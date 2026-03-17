import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://todoclickmx.vercel.app'
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/admin-login', '/api/'] },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
