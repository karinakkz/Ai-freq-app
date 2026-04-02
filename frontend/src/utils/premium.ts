import AsyncStorage from '@react-native-async-storage/async-storage';

export type PremiumPackId =
  | 'hair_glow'
  | 'weight_loss'
  | 'anti_age'
  | 'stress_relief'
  | 'energy_boost'
  | 'lifetime_unlock';

export interface PremiumPackDefinition {
  id: PremiumPackId;
  title: string;
  subtitle: string;
  frequencyLabel: string;
  icon: string;
  price: number;
}

const TRIAL_MS = 48 * 60 * 60 * 1000;
const STORAGE_KEYS = {
  purchasedPackIds: 'freqflow.premium.purchasedPackIds',
  trialStartedAt: 'freqflow.premium.trialStartedAt',
  unlockAll: 'freqflow.premium.unlockAll',
};

export const PREMIUM_PACKS: PremiumPackDefinition[] = [
  {
    id: 'hair_glow',
    title: 'Beauty Glow',
    subtitle: 'Skin glow, radiant beauty, and hair support',
    frequencyLabel: '528 Hz beauty glow',
    icon: 'sparkles',
    price: 4.99,
  },
  {
    id: 'weight_loss',
    title: 'Weight Loss Metabolism',
    subtitle: 'Appetite curb and metabolism kick support',
    frequencyLabel: '280 / 295 Hz metabolism flow',
    icon: 'leaf',
    price: 4.99,
  },
  {
    id: 'anti_age',
    title: 'Anti-Aging Rejuvenation',
    subtitle: 'Rejuvenation, collagen support, and restore mode',
    frequencyLabel: '432 Hz rejuvenation field',
    icon: 'time',
    price: 4.99,
  },
  {
    id: 'stress_relief',
    title: 'Stress Relief Calm',
    subtitle: 'Calm nerves, soften anxiety, settle the body',
    frequencyLabel: '6 Hz theta calm',
    icon: 'heart',
    price: 4.99,
  },
  {
    id: 'energy_boost',
    title: 'Energy Boost',
    subtitle: 'Clean focus and vitality without caffeine',
    frequencyLabel: '18 Hz beta lift',
    icon: 'flash',
    price: 4.99,
  },
];

export const LIFETIME_UNLOCK = {
  id: 'lifetime_unlock' as PremiumPackId,
  title: 'Lifetime Unlock All',
  price: 49,
};

export interface PremiumState {
  isTrialActive: boolean;
  lifetimeUnlocked: boolean;
  purchasedPackIds: PremiumPackId[];
  trialEndsAt: number;
  trialRemainingMs: number;
  unlockedPackIds: PremiumPackId[];
}

async function readPurchasedPackIds(): Promise<PremiumPackId[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.purchasedPackIds);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PremiumPackId[];
  } catch {
    return [];
  }
}

export async function initializePremiumTrial() {
  const existing = await AsyncStorage.getItem(STORAGE_KEYS.trialStartedAt);
  if (!existing) {
    await AsyncStorage.setItem(STORAGE_KEYS.trialStartedAt, String(Date.now()));
  }
}

export async function getPremiumState(): Promise<PremiumState> {
  await initializePremiumTrial();

  const startedAtRaw = await AsyncStorage.getItem(STORAGE_KEYS.trialStartedAt);
  const trialStartedAt = Number(startedAtRaw || Date.now());
  const trialEndsAt = trialStartedAt + TRIAL_MS;
  const trialRemainingMs = Math.max(0, trialEndsAt - Date.now());
  const isTrialActive = trialRemainingMs > 0;
  const lifetimeUnlocked = (await AsyncStorage.getItem(STORAGE_KEYS.unlockAll)) === 'true';
  const purchasedPackIds = await readPurchasedPackIds();
  const unlockedPackIds = lifetimeUnlocked || isTrialActive
    ? PREMIUM_PACKS.map((pack) => pack.id)
    : purchasedPackIds;

  return {
    isTrialActive,
    lifetimeUnlocked,
    purchasedPackIds,
    trialEndsAt,
    trialRemainingMs,
    unlockedPackIds,
  };
}

export async function unlockPackLocally(packId: PremiumPackId) {
  const purchasedPackIds = await readPurchasedPackIds();
  const next = Array.from(new Set([...purchasedPackIds, packId]));
  await AsyncStorage.setItem(STORAGE_KEYS.purchasedPackIds, JSON.stringify(next));
}

export async function unlockLifetimeLocally() {
  await AsyncStorage.setItem(STORAGE_KEYS.unlockAll, 'true');
}

export async function expireTrialForTesting() {
  await AsyncStorage.setItem(STORAGE_KEYS.trialStartedAt, String(Date.now() - TRIAL_MS - 1000));
}

export function formatTrialRemaining(ms: number) {
  const hours = Math.max(0, Math.ceil(ms / (60 * 60 * 1000)));
  if (hours >= 24) {
    return `${Math.ceil(hours / 24)} day${hours >= 48 ? 's' : ''} left`;
  }
  return `${hours}h left`;
}

export function isPackUnlocked(state: PremiumState, packId: PremiumPackId) {
  return state.unlockedPackIds.includes(packId) || state.lifetimeUnlocked;
}