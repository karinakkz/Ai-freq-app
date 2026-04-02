# 🚀 AI Freq's - App Store Launch Guide

## Step 1: Create Your Accounts

### Apple Developer Account
1. Go to https://developer.apple.com/programs/enroll/
2. Sign in with your Apple ID (or create one)
3. Pay $99/year enrollment fee
4. Wait for approval (usually instant for individuals, 24-48hrs for orgs)

### Google Play Developer Account
1. Go to https://play.google.com/console/signup
2. Sign in with your Google account
3. Pay $25 one-time fee
4. Complete identity verification

### Expo Account (Free)
1. Go to https://expo.dev/signup
2. Create account with email or GitHub

---

## Step 2: Download Your App Code

Since you're building outside of Emergent, you need the source code.

**Option A: Push to GitHub (Recommended)**
- Ask me to push your code to your GitHub repository
- Then clone it to your computer

**Option B: Download ZIP**
- I can help you get a download link

---

## Step 3: Set Up Local Environment

On your Mac/PC, install:

```bash
# Install Node.js (if not installed)
# Download from https://nodejs.org

# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Navigate to your project
cd ai-freqs-app/frontend

# Install dependencies
yarn install
```

---

## Step 4: Configure For Your Accounts

### Update eas.json
Replace these placeholders with your actual values:
- `YOUR_APPLE_ID@email.com` → Your Apple ID email
- `YOUR_TEAM_ID` → Found in Apple Developer portal
- `YOUR_APP_STORE_CONNECT_APP_ID` → Created when you add app to App Store Connect

### For Android
1. Go to Google Play Console → Setup → API Access
2. Create a service account
3. Download the JSON key file
4. Save as `google-services.json` in your project

---

## Step 5: Build Production Apps

```bash
# Build iOS (requires Mac for final steps)
eas build --platform ios --profile production

# Build Android
eas build --platform android --profile production

# Build both at once
eas build --platform all --profile production
```

This takes 15-30 minutes. EAS builds in the cloud!

---

## Step 6: Submit to Stores

```bash
# Submit to App Store
eas submit --platform ios --latest

# Submit to Play Store
eas submit --platform android --latest
```

---

## Step 7: App Store Connect Setup (iOS)

1. Go to https://appstoreconnect.apple.com
2. Click "My Apps" → "+" → "New App"
3. Fill in:
   - **Name:** AI Freq's
   - **Primary Language:** English
   - **Bundle ID:** com.freqflow.app
   - **SKU:** aifreqs001

4. In "App Information":
   - **Privacy Policy URL:** (you need to host this)
   - **Category:** Health & Fitness

5. In "Version Information":
   - Add screenshots (6.7" and 5.5" required)
   - Add description (from /app/memory/APP_STORE_GUIDE.md)
   - Add keywords
   - Set pricing (Free with In-App Purchases)

---

## Step 8: Google Play Console Setup (Android)

1. Go to https://play.google.com/console
2. Click "Create app"
3. Fill in:
   - **App name:** AI Freq's
   - **Default language:** English
   - **App or game:** App
   - **Free or paid:** Free

4. Complete all sections in the dashboard:
   - Store listing (description, screenshots)
   - Content rating questionnaire
   - Target audience
   - Privacy policy

---

## App Store Copy (Ready to Use)

### Short Description (80 chars)
```
AI wellness companion with healing frequencies and voice reminders
```

### Full Description
```
AI Freq's is your quiet wellness companion for everyday calm, focus, glow, and better rest.

Use Flow to create reminders, support your daily routine, and play healing frequency sessions that match how you want to feel.

FEATURES
• Voice-activated AI assistant
• Healing frequency library with binaural beats
• Voice mood analyzer with personalized plans
• Calm streak tracking with social sharing
• Background audio playback

PREMIUM PACKS ($4.99 each)
• Beauty Glow - 528 Hz for radiant skin
• Weight Loss Metabolism - Appetite support
• Anti-Aging Rejuvenation - Cellular repair
• Stress Relief Calm - Deep relaxation
• Energy Boost - Revitalizing frequencies

LIFETIME UNLOCK ($49)
All premium packs plus future add-ons forever.

Support: Organicstyle@live.com
```

### Keywords (100 chars)
```
frequency,wellness,meditation,binaural,healing,calm,stress,focus,sleep,glow,energy,ai,assistant
```

---

## Screenshots Needed

Capture on your phone:
1. Home Screen (equalizer + streak)
2. Mood Analyzer (recording or results)
3. Frequencies/Heal Screen
4. Premium Packs Screen
5. Voice AI conversation

**iPhone sizes needed:**
- 6.7" (iPhone 14 Pro Max) - Required
- 5.5" (iPhone 8 Plus) - Required

**Android sizes:**
- Phone screenshots (any modern phone)
- 7" tablet (optional)
- 10" tablet (optional)

---

## Privacy Policy (Required!)

You need to host a privacy policy page. Options:
1. GitHub Pages (free)
2. Your own website
3. Notion public page
4. Google Sites (free)

I can generate the privacy policy text if needed!

---

## Timeline Expectations

| Step | Time |
|------|------|
| Account approval | 1-48 hours |
| EAS Build | 15-30 min |
| iOS Review | 1-3 days |
| Android Review | Few hours to 1 day |

---

## Need Help?

Once your accounts are ready, let me know and I can:
1. Help push code to your GitHub
2. Generate privacy policy text
3. Walk through any specific step

Good luck with your launch! 🚀
