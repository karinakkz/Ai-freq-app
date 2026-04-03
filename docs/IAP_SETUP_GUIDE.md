# Apple In-App Purchase Setup Guide

Once your Apple Developer account is activated, follow these steps to set up In-App Purchases for AI Freq's.

## Step 1: Create Your App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **My Apps** → **+** → **New App**
3. Fill in:
   - **Platform**: iOS
   - **Name**: AI Freq's
   - **Primary Language**: English (Australia)
   - **Bundle ID**: `com.freqflow.app`
   - **SKU**: `aifreqs2026` (any unique identifier)
   - **User Access**: Full Access

## Step 2: Create In-App Purchase Products

Go to your app → **In-App Purchases** → **Manage**

### Create these 6 products:

#### 1. Beauty Glow Pack
- **Type**: Non-Consumable
- **Reference Name**: Beauty Glow Pack
- **Product ID**: `com.freqflow.pack.hairglow`
- **Price**: Tier 5 ($4.99 USD)
- **Display Name**: Beauty Glow
- **Description**: Unlock the Beauty Glow frequency pack with skin glow, radiant beauty, and hair support sessions.

#### 2. Weight Loss Metabolism Pack
- **Type**: Non-Consumable
- **Reference Name**: Weight Loss Metabolism Pack
- **Product ID**: `com.freqflow.pack.weightloss`
- **Price**: Tier 5 ($4.99 USD)
- **Display Name**: Weight Loss Metabolism
- **Description**: Unlock metabolism support frequencies for appetite control and metabolic balance.

#### 3. Anti-Aging Rejuvenation Pack
- **Type**: Non-Consumable
- **Reference Name**: Anti-Aging Rejuvenation Pack
- **Product ID**: `com.freqflow.pack.antiage`
- **Price**: Tier 5 ($4.99 USD)
- **Display Name**: Anti-Aging Rejuvenation
- **Description**: Unlock rejuvenation frequencies for collagen support and cellular restoration.

#### 4. Stress Relief Calm Pack
- **Type**: Non-Consumable
- **Reference Name**: Stress Relief Calm Pack
- **Product ID**: `com.freqflow.pack.stressrelief`
- **Price**: Tier 5 ($4.99 USD)
- **Display Name**: Stress Relief Calm
- **Description**: Unlock calming frequencies to soften anxiety and settle the nervous system.

#### 5. Energy Boost Pack
- **Type**: Non-Consumable
- **Reference Name**: Energy Boost Pack
- **Product ID**: `com.freqflow.pack.energyboost`
- **Price**: Tier 5 ($4.99 USD)
- **Display Name**: Energy Boost
- **Description**: Unlock energizing frequencies for clean focus and vitality without caffeine.

#### 6. Lifetime Unlock All
- **Type**: Non-Consumable
- **Reference Name**: Lifetime Unlock All
- **Product ID**: `com.freqflow.lifetime`
- **Price**: Tier 44 ($49.99 USD)
- **Display Name**: Lifetime Unlock All
- **Description**: Unlock all current and future premium frequency packs forever with a single purchase.

## Step 3: Submit Products for Review

For each product:
1. Add a **Screenshot** (can be any app screenshot showing the product)
2. Set **Availability** to all regions
3. Click **Save**
4. Status will show "Ready to Submit" (will be reviewed with app)

## Step 4: Create Sandbox Test Account

For testing purchases before going live:

1. Go to **Users and Access** → **Sandbox** → **Testers**
2. Click **+** to create a new tester
3. Use a fake email (e.g., `test@example.com`)
4. Set a password you'll remember
5. **Do NOT** use a real Apple ID

### To Test Purchases:
1. Sign out of App Store on your iPhone
2. Build and install the app via TestFlight
3. Tap "Buy" on a premium pack
4. Sign in with your sandbox account when prompted
5. The purchase will complete without charging real money

## Step 5: Product ID Reference

Make sure these EXACTLY match your App Store Connect products:

| Pack | Product ID |
|------|------------|
| Beauty Glow | `com.freqflow.pack.hairglow` |
| Weight Loss | `com.freqflow.pack.weightloss` |
| Anti-Aging | `com.freqflow.pack.antiage` |
| Stress Relief | `com.freqflow.pack.stressrelief` |
| Energy Boost | `com.freqflow.pack.energyboost` |
| Lifetime | `com.freqflow.lifetime` |

## Troubleshooting

### "Product not found" error
- Products can take up to 1 hour to propagate after creation
- Ensure Product ID exactly matches (case-sensitive)
- Make sure status is "Ready to Submit" not "Missing Metadata"

### "Cannot connect to iTunes Store"
- Check your internet connection
- Try again in a few minutes
- On simulator: IAP doesn't work, use real device

### Purchase doesn't unlock content
- Check that `finishTransaction` is being called
- Verify the product ID mapping in the app code

---

## Quick Checklist

- [ ] Apple Developer membership active
- [ ] App created in App Store Connect
- [ ] 6 IAP products created with correct Product IDs
- [ ] Screenshots added to each product
- [ ] Sandbox tester account created
- [ ] Expo credentials configured
- [ ] Test purchase works in sandbox

Once all these are done, you're ready to submit to the App Store!
