// PaymentContext.tsx - Unified payment context that uses:
// - Apple In-App Purchases on iOS
// - Stripe on Android and Web

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Platform, Alert } from 'react-native';
import * as ExpoIAP from 'expo-iap';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PREMIUM_PACKS, LIFETIME_UNLOCK, type PremiumPackId } from '../utils/premium';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Apple IAP Product IDs - must match App Store Connect
const APPLE_PRODUCT_IDS = {
  hair_glow: 'com.freqflow.pack.hair_glow',
  weight_loss: 'com.freqflow.pack.weight_loss',
  anti_age: 'com.freqflow.pack.anti_age',
  stress_relief: 'com.freqflow.pack.stress_relief',
  energy_boost: 'com.freqflow.pack.energy_boost',
  lifetime_unlock: 'com.freqflow.lifetime',
};

// Map Apple product ID back to our pack ID
const APPLE_ID_TO_PACK: Record<string, PremiumPackId> = {
  'com.freqflow.pack.hair_glow': 'hair_glow',
  'com.freqflow.pack.weight_loss': 'weight_loss',
  'com.freqflow.pack.anti_age': 'anti_age',
  'com.freqflow.pack.stress_relief': 'stress_relief',
  'com.freqflow.pack.energy_boost': 'energy_boost',
  'com.freqflow.lifetime': 'lifetime_unlock',
};

interface PaymentResult {
  success: boolean;
  error?: string;
  packId?: string;
  purchaseType?: string;
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

export function PaymentProvider({ children }: PaymentProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [products, setProducts] = useState<Map<string, ExpoIAP.IAPProduct>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  // Determine if we should use Apple IAP (iOS only)
  const isAppleIAP = Platform.OS === 'ios';

  // Initialize IAP on iOS
  useEffect(() => {
    if (!isAppleIAP) {
      setIsInitialized(true);
      return;
    }

    const initIAP = async () => {
      try {
        // Setup IAP connection
        await ExpoIAP.setup({ storekitMode: 'STOREKIT2_MODE' });
        setIsConnected(true);

        // Fetch products from App Store
        const productIds = Object.values(APPLE_PRODUCT_IDS);
        const fetchedProducts = await ExpoIAP.getProducts(productIds);
        
        const productMap = new Map<string, ExpoIAP.IAPProduct>();
        fetchedProducts.forEach(product => {
          productMap.set(product.productId, product);
        });
        setProducts(productMap);

        console.log('IAP initialized with products:', fetchedProducts.map(p => p.productId));
      } catch (error) {
        console.error('Failed to initialize IAP:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initIAP();

    return () => {
      // Cleanup
      if (isConnected) {
        ExpoIAP.endConnection?.();
      }
    };
  }, [isAppleIAP]);

  // Handle Apple IAP purchase
  const initiateApplePurchase = useCallback(async (packId: PremiumPackId): Promise<PaymentResult> => {
    const productId = APPLE_PRODUCT_IDS[packId];
    if (!productId) {
      return { success: false, error: 'Unknown pack' };
    }

    try {
      // Request purchase
      const purchase = await ExpoIAP.purchaseProduct(productId);
      
      if (!purchase) {
        return { success: false, error: 'Purchase cancelled' };
      }

      // Verify receipt with backend (optional but recommended)
      try {
        await axios.post(`${BACKEND_URL}/api/payments/verify-apple-receipt`, {
          receipt: purchase.transactionReceipt,
          product_id: productId,
          pack_id: packId,
        });
      } catch (verifyError) {
        console.warn('Backend verification failed, but purchase succeeded:', verifyError);
      }

      // Finish the transaction
      await ExpoIAP.finishTransaction(purchase);

      return {
        success: true,
        packId,
        purchaseType: packId === 'lifetime_unlock' ? 'lifetime' : 'pack',
      };
    } catch (error: any) {
      console.error('Apple IAP error:', error);
      
      // Handle specific error cases
      if (error.code === 'E_USER_CANCELLED' || error.message?.includes('cancelled')) {
        return { success: false, error: 'Purchase cancelled' };
      }
      
      return { success: false, error: error.message || 'Purchase failed' };
    }
  }, []);

  // Handle Stripe payment (Android/Web)
  const initiateStripePayment = useCallback(async (packId: PremiumPackId, returnUrl: string): Promise<PaymentResult> => {
    try {
      // For Android, use Stripe PaymentSheet
      // For Web, redirect to Stripe Checkout
      const response = await axios.post(`${BACKEND_URL}/api/payments/create-checkout-session`, {
        pack_id: packId,
        return_url: returnUrl,
      });

      if (Platform.OS === 'web') {
        // Redirect to Stripe Checkout
        window.location.href = response.data.checkout_url;
        return { success: true };
      }

      // For Android, we'd use Stripe PaymentSheet
      // This is handled by the existing StripePaymentContext
      return { success: false, error: 'Use StripePaymentContext for Android' };
    } catch (error: any) {
      return { success: false, error: error?.response?.data?.detail || error.message };
    }
  }, []);

  // Unified payment initiation
  const initiatePayment = useCallback(async (packId: PremiumPackId, returnUrl?: string): Promise<PaymentResult> => {
    if (isAppleIAP) {
      return initiateApplePurchase(packId);
    } else {
      return initiateStripePayment(packId, returnUrl || '');
    }
  }, [isAppleIAP, initiateApplePurchase, initiateStripePayment]);

  // Restore Apple purchases
  const restorePurchases = useCallback(async (): Promise<PremiumPackId[]> => {
    if (!isAppleIAP) {
      return [];
    }

    try {
      const purchases = await ExpoIAP.restorePurchases();
      const restoredPacks: PremiumPackId[] = [];

      for (const purchase of purchases) {
        const packId = APPLE_ID_TO_PACK[purchase.productId];
        if (packId) {
          restoredPacks.push(packId);
          // Finish the transaction
          await ExpoIAP.finishTransaction(purchase);
        }
      }

      return restoredPacks;
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      return [];
    }
  }, [isAppleIAP]);

  // Check payment status (for Stripe)
  const checkPaymentStatus = useCallback(async (paymentId: string) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/payments/intent-status/${paymentId}`);
      return response.data;
    } catch (error) {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/payments/checkout/status/${paymentId}`);
        return response.data;
      } catch (e) {
        throw error;
      }
    }
  }, []);

  const contextValue: PaymentContextType = {
    isAppleIAP,
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
