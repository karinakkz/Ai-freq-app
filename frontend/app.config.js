// app.config.js - Dynamic Expo config for EAS production builds
// This extends app.json with production-specific settings

module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      // Production backend URL - Railway
      backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL || "https://ai-freq-app-production.up.railway.app",
      stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_live_51QgI0KAWMVBGICxul73n67MXL2Cs2KN5hnWp5LXhMEkvAkIWp1m0RoNVukkRa9S9Z5POX0TDwhfB0cZcZP5tCB4X000ztBpdNM"
    }
  };
};
