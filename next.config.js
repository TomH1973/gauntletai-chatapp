/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    loader: 'default',
    domains: ['res.cloudinary.com']
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000']
    }
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store',
          },
        ],
      },
    ];
  },
  // Configure static file handling
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/static/:path*',
          destination: 'https://static.chatapp.example.com/:path*',
        },
        {
          source: '/media/:path*',
          destination: 'https://media.chatapp.example.com/:path*',
        },
      ],
    };
  },
}

module.exports = nextConfig; 