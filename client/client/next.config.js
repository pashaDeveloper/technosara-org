const { PHASE_DEVELOPMENT_SERVER } = require("next/constants");

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const server = (process.env.SERVER_URL || "http://localhost:8080").replace(/\/+$/, "");
    return [
      { source: "/api/:path*", destination: `${server}/api/:path*` },
      { source: "/uploads/:path*", destination: `${server}/uploads/:path*` },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.api.playstation.com",
        pathname: "/vulcan/**",
      },
      {
        protocol: "https",
        hostname: "store-images.s-microsoft.com",
        pathname: "/image/**",
      },
      {
        protocol: "https",
        hostname: "img.gamebrain.co",
        pathname: "/games/**",
      },
      {
        protocol: "https",
        hostname: "cdn.akamai.steamstatic.com",
        pathname: "/steam/apps/**",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "**/*",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "**/*",
      },
    ],
  },
};

module.exports = (phase) => ({
  ...nextConfig,
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
});
