// PaymentContext.native.tsx - Native version with Apple IAP for iOS, Stripe for Android

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Platform, Alert } from 'react-native';
import * as ExpoIAP from 'expo-iap';
import axios from 'axios';
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import { PREMIUM_PACKS, LIFETIME_UNLOCK, type PremiumPackId } from '../utils/premium';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

// Apple IAP Product IDs - must match App Store Connect
const APPLE_PRODUCT_IDS: Record<PremiumPackId, string> = {
  hair_glow: 'com.freqflow.pack.hairglow',
  weight_loss: 'com.freqflow.pack.weightloss',
  anti_age: 'com.freqflow.pack.antiage',
  stress_relief: 'com.freqflow.pack.stressrelief',
  energy_boost: 'com.freqflow.pack.energyboost',
  lifetime_unlock: 'com.freqflow.lifetime',
};

// Map Apple product ID back to our pack ID
const APPLE_ID_TO_PACK: Record<string, PremiumPackId> = {
  'com.freqflow.pack.hairglow': 'hair_glow',
  'com.freqflow.pack.weightloss': 'weight_loss',
  'com.freqflow.pack.antiage': 'anti_age',
  'com.freqflow.pack.stressrelief': 'stress_relief',
  'com.freqflow.pack.energyboost': 'energy_boost',
  'com.freqflow.lifetime': 'lifetime_unlock',
};

interface PaymentResult {
  success: boolean;
  error?: string;
  packId?: string;
  purchaseType?: string;
  paymentIntentId?: string;
}

interface PaymentContextType {
  isAppleIAP: boolean;
  isInitialized: boolean;
  products: Map<string, ExpoIAP.IAPProduct>;
  initiatePayment: (packId: PremiumPackId, returnUrl?: string) => Promise<PaymentResult>;
  restorePurchases: () => Promise<PremiumPackId[]>;
  checkPaymentStatus: (paymentId: string) => Promise<{ status: string; payment_status: string }>;
}

const PaymentContext = createContext<PaymentContextType | null>(null);

export function usePayment() {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within PaymentProvider');
  }
  return context;
}

interface PaymentProviderProps {
  children: ReactNode;
}

// Inner provider for iOS (Apple IAP)
function AppleIAPProvider({ children }: PaymentProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [products, setProducts] = useState<Map<string, ExpoIAP.IAPProduct>>(new Map());

  useEffect(() => {
    const initIAP = async () => {
      try {
        // Setup IAP connection with StoreKit 2
        await ExpoIAP.setup({ storekitMode: 'STOREKIT2_MODE' });

        // Fetch products from App Store
        const productIds = Object.values(APPLE_PRODUCT_IDS);
        const fetchedProducts = await ExpoIAP.getProducts(productIds);
        
        const productMap = new Map<string, ExpoIAP.IAPProduct>();
        fetchedProducts.forEach(product => {
          productMap.set(product.productId, product);
        });
        setProducts(productMap);

        console.log('[IAP] Initialized with products:', fetchedProducts.length);
      } catch (error) {
        console.error('[IAP] Failed to initialize:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initIAP();

    return () => {
      ExpoIAP.endConnection?.().catch(() => {});
    };
  }, []);

  const initiatePayment = useCallback(async (packId: PremiumPackId): Promise<PaymentResult> => {
    const productId = APPLE_PRODUCT_IDS[packId];
    if (!productId) {
      return { success: false, error: 'Unknown pack' };
    }

    try {
      console.log('[IAP] Starting purchase for:', productId);
      
      // Request purchase
      const purchase = await ExpoIAP.purchaseProduct(productId);
      
      if (!purchase) {
        return { success: false, error: 'Purchase cancelled' };
      }

      console.log('[IAP] Purchase successful:', purchase.transactionId);

      // Verify receipt with backend (optional but recommended for security)
      try {
        await axios.post(`${BACKEND_URL}/api/payments/verify-apple-receipt`, {
          transaction_id: purchase.transactionId,
          product_id: productId,
          pack_id: packId,
        });
      } catch (verifyError) {
        console.warn('[IAP] Backend verification failed, continuing:', verifyError);
      }

      // Finish the transaction
      await ExpoIAP.finishTransaction(purchase);

      return {
        success: true,
        packId,
        purchaseType: packId === 'lifetime_unlock' ? 'lifetime' : 'pack',
      };
    } catch (error: any) {
      console.error('[IAP] Purchase error:', error);
      
      if (error.code === 'E_USER_CANCELLED' || error.message?.includes('cancel')) {
        return { success: false, error: 'Purchase cancelled' };
      }
      
      return { success: false, error: error.message || 'Purchase failed' };
    }
  }, []);

  const restorePurchases = useCallback(async (): Promise<PremiumPackId[]> => {
    try {
      console.log('[IAP] Restoring purchases...');
      const purchases = await ExpoIAP.restorePurchases();
      const restoredPacks: PremiumPackId[] = [];

      for (const purchase of purchases) {
        const packId = APPLE_ID_TO_PACK[purchase.productId];
        if (packId) {
          restoredPacks.push(packId);
          await ExpoIAP.finishTransaction(purchase);
        }
      }

      console.log('[IAP] Restored packs:', restoredPacks);
      return restoredPacks;
    } catch (error) {
      console.error('[IAP] Failed to restore:', error);
      return [];
    }
  }, []);

  const checkPaymentStatus = useCallback(async (_paymentId: string) => {
    // Apple IAP doesn't use payment IDs like Stripe
    return { status: 'succeeded', payment_status: 'paid' };
  }, []);

  const contextValue: PaymentContextType = {
    isAppleIAP: true,
    isInitialized,
    products,
    initiatePayment,
    restorePurchases,
    checkPaymentStatus,
  };

  return (
    <PaymentContext.Provider value={contextValue}>
      {children}
    </PaymentContext.Provider>
  );
}

// Inner provider for Android (Stripe)
function AndroidStripeProviderInner({ children }: PaymentProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const stripe = useStripe();

  useEffect(() => {
    setIsInitialized(true);
  }, []);

  const initiatePayment = useCallback(async (packId: PremiumPackId): Promise<PaymentResult> => {
    if (!stripe) {
      return { success: false, error: 'Stripe not initialized' };
    }

    try {
      // Create PaymentIntent on backend
      const response = await axios.post(`${BACKEND_URL}/api/payments/create-payment-intent`, {
        pack_id: packId,
      });

      const { clientSecret, paymentIntentId, purchase_type } = response.data;

      // Initialize PaymentSheet
      const { error: initError } = await stripe.initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: "AI Freq's",
        style: 'alwaysDark',
        googlePay: {
          merchantCountryCode: 'US',
          testEnv: false,
        },
      });

      if (initError) {
        return { success: false, error: initError.message };
      }

      // Present PaymentSheet
      const { error: presentError } = await stripe.presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') {
          return { success: false, error: 'Payment cancelled' };
        }
        return { success: false, error: presentError.message };
      }

      return {
        success: true,
        paymentIntentId,
        packId,
        purchaseType: purchase_type,
      };
    } catch (error: any) {
      return { success: false, error: error?.response?.data?.detail || error.message };
    }
  }, [stripe]);

  const restorePurchases = useCallback(async (): Promise<PremiumPackId[]> => {
    // Stripe doesn't have purchase restoration - purchases are stored locally
    return [];
  }, []);

  const checkPaymentStatus = useCallback(async (paymentId: string) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/payments/intent-status/${paymentId}`);
      return response.data;
    } catch (error) {
      const response = await axios.get(`${BACKEND_URL}/api/payments/checkout/status/${paymentId}`);
      return response.data;
    }
  }, []);

  const contextValue: PaymentContextType = {
    isAppleIAP: false,
    isInitialized,
    products: new Map(),
    initiatePayment,
    restorePurchases,
    checkPaymentStatus,
  };

  return (
    <PaymentContext.Provider value={contextValue}>
      {children}
    </PaymentContext.Provider>
  );
}

function AndroidStripeProvider({ children }: PaymentProviderProps) {
  if (!STRIPE_PUBLISHABLE_KEY) {
    console.warn('[Payment] Stripe key not configured');
    return (
      <PaymentContext.Provider value={{
        isAppleIAP: false,
        isInitialized: true,
        products: new Map(),
        initiatePayment: async () => ({ success: false, error: 'Stripe not configured' }),
        restorePurchases: async () => [],
        checkPaymentStatus: async () => ({ status: 'unknown', payment_status: 'unknown' }),
      }}>
        {children}
      </PaymentContext.Provider>
    );
  }

  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier="merchant.com.freqflow.app"
      urlScheme="freqflow"
    >
      <AndroidStripeProviderInner>{children}</AndroidStripeProviderInner>
    </StripeProvider>
  );
}

// Main provider - chooses between Apple IAP (iOS) and Stripe (Android)
export function PaymentProvider({ children }: PaymentProviderProps) {
  if (Platform.OS === 'ios') {
    return <AppleIAPProvider>{children}</AppleIAPProvider>;
  }
  return <AndroidStripeProvider>{children}</AndroidStripeProvider>;
}
