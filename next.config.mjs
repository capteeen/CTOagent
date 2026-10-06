/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // wallet-adapter / web3.js pull in optional node-only deps
    config.externals.push('pino-pretty', 'encoding');
    return config;
  },
};

export default nextConfig;
