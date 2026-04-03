// app.config.js - Dynamic Expo config for production builds
module.exports = {
  expo: {
    name: "AI Freq's",
    slug: "freqflow",
    version: "1.0.0",
    owner: "karinak",
    orientation: "default",
    icon: "./assets/images/icon.png",
    scheme: "freqflow",
    userInterfaceStyle: "dark",
    newArchEnabled: false,
    splash: {
      image: "./assets/images/splash-image.png",
      resizeMode: "contain",
      backgroundColor: "#0a0a0a"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.freqflow.app",
      infoPlist: {
        NSMicrophoneUsageDescription: "Record voice commands to create tasks",
        NSCameraUsageDescription: "Take photos for your notes",
        NSPhotoLibraryUsageDescription: "Add photos to your notes",
        UIBackgroundModes: ["audio"],
        NSLocationWhenInUseUsageDescription: "Get weather for your location"
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#0a0a0a"
      },
      package: "com.freqflow.app",
      permissions: [
        "RECORD_AUDIO",
        "WRITE_EXTERNAL_STORAGE",
        "READ_EXTERNAL_STORAGE",
        "ACCESS_NETWORK_STATE",
        "INTERNET",
        "FOREGROUND_SERVICE"
      ],
      edgeToEdgeEnabled: true
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-asset",
      "expo-iap",
      [
        "expo-audio",
        {
          microphonePermission: "Use mic for Flow commands",
          enableBackgroundPlayback: true,
          enableBackgroundRecording: false
        }
      ],
      "expo-secure-store",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-image.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#0a0a0a"
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      // EAS Project Configuration - CRITICAL for builds
      eas: {
        projectId: "a193de51-04a7-48ad-b19e-fcbbcd325945"
      },
      // Production backend URL - Railway
      backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL || "https://ai-freq-app-production.up.railway.app",
      stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_live_51QgI0KAWMVBGICxul73n67MXL2Cs2KN5hnWp5LXhMEkvAkIWp1m0RoNVukkRa9S9Z5POX0TDwhfB0cZcZP5tCB4X000ztBpdNM"
    }
  }
};
