/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🔥 Enable gzip compression for responses
  compress: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
      },
      {
        protocol: "https",
        hostname: "uploadthing.com",
      },
      {
        protocol: "https",
        hostname: "ufs.sh",
      },
      {
        protocol: "https",
        hostname: "play-lh.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "sea1.ingest.uploadthing.com",
      },
      {
        protocol: "https",
        hostname: "dyjh2wszjk.ufs.sh",
      },
    ],
  },

  // 🔥 Security + Performance headers
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },

  // 🔥 Prisma + Turbopack fix
  // experimental: {
  //   serverMinification: false,
  // },

  // webpack: (config) => {
  //   // 🔥 Fix pg / pg-native errors in Turbopack
  //   config.resolve = config.resolve || {};
  //   config.resolve.alias = {
  //     ...config.resolve.alias,
  //     "pg-native": false,
  //   };

  //   // Your existing externals
  //   config.externals.push({
  //     "utf-8-validate": "commonjs utf-8-validate",
  //     bufferutil: "commonjs bufferutil",
  //     canvas: "commonjs canvas",
  //   });

  //   return config;
  // },
};

export default nextConfig;

