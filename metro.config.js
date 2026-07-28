// Sentry's Metro wrapper (getSentryExpoConfig) replaces getDefaultConfig so
// source maps are generated + uploadable for readable crash stack traces.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

// Keep the existing resolver tweaks.
config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
