export const pwaManifest = {
  name: 'Premium Attendance',
  short_name: 'Attendance',
  description: 'Premium attendance and tracking PWA.',
  start_url: '/',
  display: 'standalone',
  background_color: '#f7f7f2',
  theme_color: '#0b5b3f',
  icons: [
    {
      src: '/icons/icon-192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icons/icon-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icons/icon-192-maskable.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'maskable',
    },
    {
      src: '/icons/icon-512-maskable.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
}
