# AI Freq's — App Store Submission Guide

## Apple App Store (iOS)

### App Information
- **App Name:** AI Freq's
- **Subtitle:** AI Wellness & Frequency Companion
- **Bundle ID:** com.freqflow.app
- **Category:** Health & Fitness (Primary), Lifestyle (Secondary)
- **Content Rating:** 4+ (No objectionable content)

### App Store Description
```
AI Freq's is your quiet wellness companion for everyday calm, focus, glow, and better rest.

Use Flow to create reminders, support your daily routine, and play healing frequency sessions that match how you want to feel. The free core stays simple and useful, while premium packs unlock deeper beauty, stress, energy, and transformation journeys.

FEATURES
• Voice-activated AI assistant for reminders and wellness support
• Healing frequency library with binaural beats
• Calm streak tracking with social sharing
• Push-to-talk voice commands
• Background audio playback

PREMIUM PACKS ($4.99 each)
• Beauty Glow - 528 Hz for radiant skin and hair
• Weight Loss Metabolism - Appetite and energy support
• Anti-Aging Rejuvenation - Cellular restoration frequencies
• Stress Relief Calm - Deep relaxation tones
• Energy Boost - Revitalizing frequencies

LIFETIME UNLOCK ($49)
Get all premium packs plus future add-ons forever.

FREE FEATURES
• Basic frequency tones
• Voice assistant (Hey Flow)
• Task reminders
• Streak tracking
• 2-day premium trial

Support: Organicstyle@live.com
```

### Keywords (100 character limit)
```
frequency,wellness,meditation,binaural,healing,calm,stress,focus,sleep,glow,energy,ai,assistant
```

### What's New (Release Notes)
```
Version 1.0
• AI wellness assistant with voice commands
• Healing frequency library
• Premium packs: Beauty, Weight Loss, Anti-Age, Stress, Energy
• Calm streak tracking and sharing
• Native payment with Apple Pay support
```

### Privacy Policy URL
https://[your-domain]/privacy

### Support URL
https://[your-domain]/contact

### Screenshots Required
1. **Home Screen** (6.7" and 5.5" sizes)
   - Shows equalizer, streak, listening status
2. **Voice Screen** - AI conversation
3. **Frequencies/Heal Screen** - Pack selection
4. **Premium Screen** - Purchase options
5. **Tasks Screen** - Task list

### App Review Information
- **Demo Account:** Not required (app works without login)
- **Notes for Review:** 
  - In-app purchases use native PaymentSheet
  - Free trial available for 2 days
  - Voice features require microphone permission

---

## Google Play Store (Android)

### Store Listing
- **App Name:** AI Freq's
- **Short Description:** AI wellness companion with healing frequencies and voice reminders
- **Category:** Health & Fitness
- **Content Rating:** Everyone

### Full Description
```
AI Freq's is your quiet wellness companion for everyday calm, focus, glow, and better rest.

Use Flow to create reminders, support your daily routine, and play healing frequency sessions that match how you want to feel. The free core stays simple and useful, while premium packs unlock deeper beauty, stress, energy, and transformation journeys.

★ FEATURES
• Voice-activated AI assistant for reminders and wellness support
• Healing frequency library with binaural beats
• Calm streak tracking with social sharing
• Push-to-talk voice commands
• Background audio playback

★ PREMIUM PACKS ($4.99 each)
• Beauty Glow - 528 Hz for radiant skin and hair
• Weight Loss Metabolism - Appetite and energy support
• Anti-Aging Rejuvenation - Cellular restoration frequencies
• Stress Relief Calm - Deep relaxation tones
• Energy Boost - Revitalizing frequencies

★ LIFETIME UNLOCK ($49)
Get all premium packs plus future add-ons forever.

★ FREE FEATURES
• Basic frequency tones
• Voice assistant (Hey Flow)
• Task reminders
• Streak tracking
• 2-day premium trial

Support: Organicstyle@live.com
AI Freq's by OrganicStylz
```

### Graphics Required
1. **Feature Graphic:** 1024 x 500 px
2. **Phone Screenshots:** 2-8 screenshots (1080 x 1920 recommended)
3. **App Icon:** 512 x 512 px

### Permissions Justification
- **RECORD_AUDIO:** Voice commands for AI assistant
- **INTERNET:** API communication and payments
- **FOREGROUND_SERVICE:** Background frequency playback

---

## Expo Build Commands

### iOS Build
```bash
eas build --platform ios --profile production
```

### Android Build
```bash
eas build --platform android --profile production
```

### Submit to Stores
```bash
# iOS
eas submit --platform ios

# Android
eas submit --platform android
```

---

## Pre-Submission Checklist
- [ ] Test on physical iOS device
- [ ] Test on physical Android device
- [ ] Verify all in-app purchases work
- [ ] Confirm microphone permission prompt
- [ ] Confirm background audio works
- [ ] Review Privacy Policy
- [ ] Review Terms of Service
- [ ] Prepare support email responses
