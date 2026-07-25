/**
 * Debug endpoint to check environment configuration
 * Visit: http://localhost:3000/api/debug-config
 */

import config from '@/lib/config';

export async function GET() {
  const debugInfo = {
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
      NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    },
    urls: {
      NEXT_PUBLIC_LOCAL_API_URL: process.env.NEXT_PUBLIC_LOCAL_API_URL,
      NEXT_PUBLIC_DEV_API_URL: process.env.NEXT_PUBLIC_DEV_API_URL,
      NEXT_PUBLIC_PROD_API_URL: process.env.NEXT_PUBLIC_PROD_API_URL,
    },
    selected: {
      env: config.env,
      apiUrl: config.apiUrl,
      isDev: config.isDev,
      isLocal: config.isLocal,
      isProd: config.isProd,
    },
    features: config.features,
    timestamp: new Date().toISOString(),
  };

  return Response.json(debugInfo);
}
