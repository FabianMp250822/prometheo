import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  experimental: {
    // This key is intentionally left empty.
  },
  allowedDevOrigins: [
    'https://6000-firebase-studio-1751988148835.cluster-joak5ukfbnbyqspg4tewa33d24.cloudworkstations.dev',
    'https://9000-firebase-studio-1751988148835.cluster-joak5ukfbnbyqspg4tewa33d24.cloudworkstations.dev',
    "https://studio--prometeo-ffd3w.us-central1.hosted.app",
    "https://www.dajusticia.com",
    "https://www.dajusticia.com.co"
  ],
};

export default nextConfig;
