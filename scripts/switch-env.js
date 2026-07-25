#!/usr/bin/env node
/**
 * switch-env.js
 * Automatically switches environment in .env file based on argument
 * Usage: node scripts/switch-env.js local|dev|production
 * Uses environment-specific variables: NEXT_PUBLIC_LOCAL_API_URL, NEXT_PUBLIC_DEV_API_URL, NEXT_PUBLIC_PROD_API_URL
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');

const environments = {
  local: {
    NODE_ENV: 'development',
    NEXT_PUBLIC_ENV: 'local',
    NEXT_PUBLIC_APP_NAME: 'Pixel Eye Blog Admin - Local',
  },
  dev: {
    NODE_ENV: 'development',
    NEXT_PUBLIC_ENV: 'dev',
    NEXT_PUBLIC_APP_NAME: 'Pixel Eye Blog Admin - Dev',
  },
  production: {
    NODE_ENV: 'production',
    NEXT_PUBLIC_ENV: 'production',
    NEXT_PUBLIC_APP_NAME: 'Pixel Eye Blog Admin',
  },
};

const envName = process.argv[2];

if (!envName || !environments[envName]) {
  console.error('❌ Usage: npm run env:switch local|dev|production');
  console.error(`   Available: ${Object.keys(environments).join(', ')}`);
  process.exit(1);
}

const selectedEnv = environments[envName];

// Read current .env
let envContent = fs.readFileSync(envPath, 'utf8');

// Replace environment variables
Object.entries(selectedEnv).forEach(([key, value]) => {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  envContent = envContent.replace(regex, `${key}=${value}`);
});

// Write back
fs.writeFileSync(envPath, envContent, 'utf8');

console.log(`✅ Switched to ${envName.toUpperCase()} environment`);
console.log(`   NEXT_PUBLIC_ENV: ${selectedEnv.NEXT_PUBLIC_ENV}`);
console.log(`   NODE_ENV: ${selectedEnv.NODE_ENV}`);
console.log(`   App Name: ${selectedEnv.NEXT_PUBLIC_APP_NAME}`);
console.log(`   API URL: Uses NEXT_PUBLIC_${envName.toUpperCase()}_API_URL from .env`);
