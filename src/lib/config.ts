/**
 * config.ts
 * ─────────
 * Environment-aware configuration module
 * Dynamically loads API endpoints based on environment using ENV-specific variables
 */

const ENV = process.env.NEXT_PUBLIC_ENV || 'local';

const getApiUrl = () => {
  const urls = {
    local: process.env.NEXT_PUBLIC_LOCAL_API_URL,
    dev: process.env.NEXT_PUBLIC_DEV_API_URL,
    production: process.env.NEXT_PUBLIC_PROD_API_URL,
  };

  const browserHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocalBrowser = ['localhost', '127.0.0.1', '::1'].includes(browserHostname);
  if (isLocalBrowser && urls.local) return urls.local;

  const selectedUrl = urls[ENV as keyof typeof urls] || urls.local;

  if (!selectedUrl) {
    console.error(`[config] ⚠️ No API URL found for environment "${ENV}"`);
    console.error(`[config] Available URLs:`, urls);
  }

  return selectedUrl;
};

const API_URL = getApiUrl();
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Pixel Eye Blog Admin';

const config = {
  env: ENV,
  isDev: ENV === 'dev',
  isLocal: ENV === 'local',
  isProd: ENV === 'production',
  apiUrl: API_URL,
  appName: APP_NAME,

  api: {
    base: API_URL,
  },

  features: {
    debug: ENV !== 'production',
    analytics: ENV === 'production',
    customTemplateBuilder: process.env.NEXT_PUBLIC_CUSTOM_TEMPLATE_BUILDER_ENABLED === 'true',
  },
};

export default config;
