/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@openride/api-client',
    '@openride/db',
    '@openride/realtime',
    '@openride/ui',
  ],
};

export default nextConfig;
