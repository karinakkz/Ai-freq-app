// app.config.js - Dynamic Expo config for production builds
module.exports = {
  expo: {
    name: "AI Freq's",
    slug: "ai-freqs",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "freqflow",
    userInterfaceStyle: "dark",
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#050510"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.freqflow.app",
      infoPlist: {
        NSMicrophoneUsageDescription: "Voice commands for AI assistant",
        UIBackgroundModes: ["audio"]
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#050510"
      },
      package: "com.freqflow.app",
      permissions: ["RECORD_AUDIO", "FOREGROUND_SERVICE"]
    },
    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-audio",
        {
          "microphonePermission": "Voice commands for AI assistant"
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      // Production backend URL - Railway
      backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL || "https://ai-freq-app-production.up.railway.app",
      stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_live_51QgI0KAWMVBGICxul73n67MXL2Cs2KN5hnWp5LXhMEkvAkIWp1m0RoNVukkRa9S9Z5POX0TDwhfB0cZcZP5tCB4X000ztBpdNM"
    }
  }
};
