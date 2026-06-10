/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@openride/api-client',
    '@openride/db',
    '@openride/realtime',
    '@openride/ui',
  ],
  experimental: { instrumentationHook: false },
};

export default nextConfig;
