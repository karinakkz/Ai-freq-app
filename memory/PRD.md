# AI Freq's - PRD

## Problem Statement
Build a cross-platform Expo mobile wellness app called **AI Freq's** that combines:
- AI voice assistance for reminders, notes, simple task creation, and wellness support
- Healing frequency / binaural beat playback with a dark, alive-looking wave UI
- Stress-aware wellness flows and smart scheduling foundations
- A featured educational frequency library including packs like **Weight Loss Transformation**

## Current Architecture
```
/app
├── backend/
│   ├── .env
│   ├── requirements.txt
│   └── server.py                # FastAPI app, GPT/Whisper, task logic, frequency catalog, audio generation
├── frontend/
│   ├── app/                     # Expo Router route files only
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── frequencies.tsx
│   │   ├── voice.tsx
│   │   ├── tasks.tsx
│   │   └── settings.tsx
│   ├── src/
│   │   ├── screens/
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── FrequenciesScreen.tsx
│   │   │   ├── VoiceScreen.tsx
│   │   │   ├── TasksScreen.tsx
│   │   │   └── SettingsScreen.tsx
│   │   └── utils/
│   │       └── BinauralBeats.ts
│   └── app.json
├── test_result.md
└── test_reports/
```

## Implemented
### Frontend
- 5-tab navigation: Home, Heal, Voice, Tasks, Settings
- Dark mode animated cyan/blue/emerald wave UI
- Heal/Frequencies screen with 40+ frequencies and category browsing
- **Featured Weight Loss Transformation pack** with open/close behavior and playable cards
- Voice screen with expo-audio recorder flow and local device speech replies
- Voice response path tuned for faster answers and stronger built-in device speech playback
- Task result feedback cards and better testIDs on critical controls
- Home screen restored to the original equalizer-style listening card with a modern neon ribbon underlay
- Home screen now includes a native streak sharing entry point
- Premium monetization screen with 5 paid packs, lifetime unlock banner, local trial timer, and local unlock persistence
- Premium catalog updated to Beauty Glow, Weight Loss Metabolism, Anti-Aging Rejuvenation, Stress Relief Calm, and Energy Boost with lifetime unlock at **$49**
- Brand identity added in-app: **AI Freq's by OrganicStylz** with support email `Organicstyle@live.com` on Home, Premium, and Settings
- Launch support/legal pages added: Privacy Policy, Terms of Use, and Contact & Help
- Premium launch polish added: Restore Purchases button, clearer Owned / Trial Open / Locked states, and Buy Now wording
- Release-clean pass completed: debug voice UI hidden from the screen, premium fast-forward test control removed, and launch docs added in `/app/memory/LAUNCH_CHECKLIST.md` and `/app/memory/RELEASE_NOTES.md`
- User-facing rename completed to **AI Freq's** across app name, legal/store copy, major screens, and regenerated launch assets

### Backend
- Task CRUD APIs
- Whisper transcription endpoint at `/api/voice/transcribe`
- GPT-powered Flow Freak chat at `/api/chat`
- Shared AI action handling so chat + voice can both create tasks/schedules
- Reminder time parsing and storage on created tasks
- Server-generated WAV playback endpoints:
  - `/api/audio/generate/{freq_id}`
  - `/api/audio/custom`
- Waveform synthesis support on audio endpoints: `sine`, `triangle`, `square`, `sawtooth`
- Frequency catalog, pack APIs, stress metrics, calm streaks, schedules
- Stripe-backed premium checkout session APIs with Mongo payment transaction tracking

### Integrations
- OpenAI `gpt-5.2` via Emergent universal key
- OpenAI `whisper-1` via Emergent universal key
- MongoDB local database
- Expo local speech replies via `expo-speech`
- Stripe checkout sessions via Emergent Stripe integration
- Native share menu via `react-native-share` with fallback to React Native Share API

## Verified This Session
- Weight Loss pack is visible on the Heal tab
- Pack opens and Weight Loss Support enters now-playing state
- `/api/audio/generate/weight_loss` returns valid WAV audio
- `/api/chat` reminder creation now stores `reminder_time`
- Voice quick-action flow creates tasks and shows success feedback
- Testing agent regression passed for targeted backend + frontend flows
- Backend waveform endpoint tests passed for all four wave shapes
- Testing agent verified Alpha wave picker, immersive 3D modal, Heal card wave pickers, and rainbow landscape behavior
- Premium checkout session creation works and opens real Stripe checkout
- Stripe test card flow (`4242 4242 4242 4242`) was run through checkout and returned to the Premium screen successfully
- Premium screen and Home share button render in preview after Stripe plugin crash fix
- Launch-polish regression passed for Home branding, Settings support/legal links, Premium restore/badge states, and legal/footer links
- Voice fast-path regression passed: faster voice-context reminder creation, voice endpoints healthy, and Voice screen suggestion/status flows verified

## Backlog
### P0
- Physical-device validation for native audio playback and microphone behavior in Expo Go

### P1
- Smarter schedule execution while sleeping/driving
- Real weather integration
- Real calendar sync integration
- Better native wake-word approach while app is open/foregrounded
- Reduce remaining non-blocking web preview warnings (`pointerEvents`, `useNativeDriver` fallback)
- Add purchase restore UX / richer ownership labels after payment across devices
- Optional native-device check for mailto handoff from Contact screen

### P2
- Home screen widgets for iOS/Android
- Stronger local encryption/privacy storage
- Refactor oversized backend/frontend files into smaller modules
