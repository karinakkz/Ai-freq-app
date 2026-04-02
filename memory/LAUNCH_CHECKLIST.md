# AI Freq's — Launch Checklist

## Final Product Checks
- [x] Voice record button returns transcription + AI reply on real phone
- [x] Premade voice suggestions speak clearly
- [x] Frequency playback works on speakers and headphones
- [x] Background audio behavior feels stable
- [x] Streak share opens native share sheet

## Payments
- [x] Replace Stripe test environment with live production setup
- [x] Live secret key configured in backend
- [x] Live publishable key configured in frontend
- [x] Native PaymentSheet implemented for iOS/Android
- [x] Web checkout URL redirect working
- [ ] Test one real pack purchase (user to verify)
- [ ] Test Lifetime Unlock All (user to verify)
- [x] Confirm local unlock persists after app restart
- [x] Confirm Restore Purchases messaging feels clear

## Badge System
- [x] Lifetime Member banner shows when all packs owned
- [x] "X Packs Owned" banner for partial purchases
- [x] Trial status pill in hero section
- [x] Individual pack badges (Owned/Trial Open/Locked)

## Brand / Legal
- [x] App name shows as AI Freq's
- [x] OrganicStylz branding is correct
- [x] Support email is correct: Organicstyle@live.com
- [x] Privacy Policy page reviewed
- [x] Terms of Use page reviewed
- [x] Contact & Help page reviewed

## App Store / Play Store Assets
- [ ] Review icon on device
- [ ] Review splash screen on device
- [ ] Capture screenshots for Home, Voice, Premium, Heal, Tasks
- [x] Add store description from STORE_COPY.md
- [x] Add promo line and keywords

## Release Safety
- [x] Confirm no debug UI remains in production screens
- [x] Confirm free/core flows still work without purchase
- [x] Confirm premium wording says Buy Now / Secure payment
- [x] Confirm app launches cleanly from fresh install

## Technical Implementation Complete
- [x] Native Stripe PaymentSheet (`@stripe/stripe-react-native`)
- [x] Platform-specific payment context (web vs native)
- [x] PaymentIntent backend endpoints
- [x] Checkout session backend endpoints
- [x] Payment status verification endpoints
- [x] Enhanced badge UI system

## Recommended Release Order
1. ✅ Final device QA (in progress)
2. ✅ Switch Stripe to live
3. ⏳ Store screenshots + metadata
4. ⏳ Submit beta / internal test
5. ⏳ Public launch
