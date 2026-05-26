/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next 15: moved out of experimental.
  // dockerode pulls in ssh2 (and cpu-features) which ship a native .node binary.
  // Mark them external so webpack leaves them as runtime requires.
  serverExternalPackages: ["dockerode", "ssh2", "cpu-features"],
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000"] },
  },
};

export default nextConfig;
