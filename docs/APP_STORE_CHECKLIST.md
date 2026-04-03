# App Store Submission Checklist for AI Freq's

## 📱 App Store Connect Requirements

### ✅ Already Complete
- [x] App Name: "AI Freq's"
- [x] Bundle ID: `com.freqflow.app`
- [x] App Icon (1024x1024)
- [x] Splash Screen
- [x] iOS Permissions configured in app.json

### ⏳ Pending - Apple Developer Account
- [ ] Apple Developer Membership activated (48hr wait)
- [ ] Create App Store Connect API Key
- [ ] Configure credentials on expo.dev
- [ ] Build .ipa file via GitHub Actions

### 📝 App Store Metadata (To Fill in App Store Connect)

#### App Information
| Field | Value |
|-------|-------|
| **App Name** | AI Freq's |
| **Subtitle** | AI Wellness & Task Assistant |
| **Primary Category** | Health & Fitness |
| **Secondary Category** | Productivity |
| **Content Rating** | 4+ |

#### Description (4000 chars max)
```
AI Freq's - Your Personal AI Wellness & Productivity Assistant

Transform your daily routine with AI Freq's, the revolutionary app that combines artificial intelligence with frequency-based wellness technology.

🎯 SMART TASK MANAGEMENT
• Voice-activated task creation - just speak and AI handles the rest
• Intelligent reminders that adapt to your schedule
• Natural language processing understands your commands

🎵 FREQUENCY WELLNESS LIBRARY
• Curated collection of therapeutic frequency sessions
• Categories include: Beauty Glow, Weight Loss Support, Anti-Aging, Stress Relief, and more
• Scientifically-inspired frequencies for relaxation and wellness

🧘 MOOD ANALYSIS
• AI-powered voice mood detection
• Personalized frequency recommendations based on your emotional state
• Track your wellness journey over time

✨ PREMIUM FEATURES
• 5 Premium frequency packs with advanced sessions
• Lifetime unlock option for dedicated wellness enthusiasts
• Regular content updates with new frequencies

🌙 DESIGNED FOR YOUR LIFESTYLE
• Beautiful dark interface with calming green accents
• Background audio playback for uninterrupted sessions
• Works seamlessly with your daily routine

Whether you're looking to boost productivity, find moments of calm, or explore frequency-based wellness, AI Freq's is your intelligent companion for a better daily life.

Download now and experience the future of wellness technology!

Note: AI Freq's is designed for general wellness and relaxation. It is not a medical device and should not replace professional medical advice.
```

#### Keywords (100 chars max)
```
AI assistant,frequencies,wellness,meditation,tasks,reminders,relaxation,productivity,voice,health
```

#### What's New (Version 1.0.0)
```
Welcome to AI Freq's! 

• AI-powered voice assistant for tasks
• Extensive frequency wellness library
• Mood analysis with personalized recommendations
• Premium packs for enhanced wellness
• Beautiful dark mode interface
```

#### Support URL
```
https://karinakkz.github.io/Ai-freq-app/support
```

#### Privacy Policy URL
```
https://karinakkz.github.io/Ai-freq-app/privacy
```

#### Terms of Service URL
```
https://karinakkz.github.io/Ai-freq-app/terms
```

---

## 📸 Screenshots Required

### iPhone 6.7" Display (iPhone 14 Pro Max, 15 Pro Max)
Size: **1290 x 2796 pixels**
- [ ] Screenshot 1: Home screen with AI assistant
- [ ] Screenshot 2: Frequency library browsing
- [ ] Screenshot 3: Playing a frequency session
- [ ] Screenshot 4: Task management view
- [ ] Screenshot 5: Premium packs showcase
- [ ] Screenshot 6: Mood analyzer feature

### iPhone 6.5" Display (iPhone 11 Pro Max, XS Max)
Size: **1284 x 2778 pixels** or **1242 x 2688 pixels**
- Same screenshots as above (can use 6.7" and Apple will scale)

### iPhone 5.5" Display (iPhone 8 Plus) - REQUIRED
Size: **1242 x 2208 pixels**
- [ ] Same screenshots (different resolution)

### iPad Pro 12.9" (if supporting iPad)
Size: **2048 x 2732 pixels**
- [ ] Optional but recommended

---

## 🔍 App Review Information

### Demo Account (if needed)
If app requires login for review:
```
Email: demo@aifreqs.app
Password: [Create a demo account]
```

### Notes for Reviewer
```
Thank you for reviewing AI Freq's!

Key features to test:
1. Voice Commands: Tap the microphone button on the home screen and say "Create a task to buy groceries tomorrow"
2. Frequency Player: Browse the Frequency Library and play any free session
3. Premium Content: Premium packs are available for purchase (you can view without buying)
4. Mood Analyzer: Access from the home screen to analyze voice mood

The app requires microphone permission for voice features. Background audio is used for frequency playback.

Contact: support@aifreqs.app
```

---

## ⚠️ Common Rejection Reasons to Avoid

1. **Privacy Policy**: ✅ Created - needs to be hosted
2. **Permissions**: ✅ All usage descriptions added to app.json
3. **Health Claims**: ✅ Disclaimer added - app is for "wellness" not medical treatment
4. **Payments**: ✅ Using Stripe (allowed for physical goods/services, but for in-app digital content, may need to use Apple IAP - verify this!)
5. **Metadata**: Ensure screenshots match actual app
6. **Crashes**: Test thoroughly before submission

---

## 🚨 IMPORTANT: In-App Purchases

**Apple requires apps to use In-App Purchases (IAP) for digital content sold within iOS apps.**

Current implementation uses Stripe, which may be rejected.

Options:
1. **Switch to Apple IAP** for frequency pack purchases (recommended)
2. **Web-based purchase** - direct users to website for purchases
3. **Physical goods exception** - only applies if selling physical items

**Recommendation**: Consider implementing Apple IAP before submission to avoid rejection.

---

## 📅 Submission Timeline

| Step | Status | ETA |
|------|--------|-----|
| Apple Developer Membership | Processing | ~48 hours |
| Configure Expo Credentials | Pending | After membership |
| Build .ipa via GitHub Actions | Pending | After credentials |
| Host Privacy Policy & ToS | Ready to do | Today |
| Prepare Screenshots | Pending | Before submission |
| Submit to App Store | Pending | After all above |
| App Review | Pending | 24-48 hours typically |

---

© 2026 AI Freq's