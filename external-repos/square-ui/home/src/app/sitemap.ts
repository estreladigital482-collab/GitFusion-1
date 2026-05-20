import type { MetadataRoute } from 'next'

const SITE_URL = 'https://square.lndevui.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/license`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
  ]
}
