// Native (iOS/Android) version of Stripe Payment Context
// Uses @stripe/stripe-react-native for native PaymentSheet

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

interface PaymentResult {
  success: boolean;
  error?: string;
  paymentIntentId?: string;
  packId?: string;
  purchaseType?: string;
}

interface StripePaymentContextType {
  isNativePaymentAvailable: boolean;
  isInitialized: boolean;
  initiatePayment: (packId: string, returnUrl: string) => Promise<PaymentResult>;
  checkPaymentStatus: (paymentId: string) => Promise<{ status: string; payment_status: string }>;
}

const StripePaymentContext = createContext<StripePaymentContextType | null>(null);

export function useStripePayment() {
  const context = useContext(StripePaymentContext);
  if (!context) {
    throw new Error('useStripePayment must be used within StripePaymentProvider');
  }
  return context;
}

interface StripePaymentProviderProps {
  children: ReactNode;
}

function StripePaymentProviderInner({ children }: StripePaymentProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const stripe = useStripe();

  useEffect(() => {
    setIsInitialized(true);
  }, []);

  const initiatePayment = useCallback(async (packId: string, _returnUrl: string): Promise<PaymentResult> => {
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
        applePay: {
          merchantCountryCode: 'US',
        },
      });

      if (initError) {
        console.error('PaymentSheet init error:', initError);
        return { success: false, error: initError.message };
      }

      // Present PaymentSheet
      const { error: presentError } = await stripe.presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') {
          return { success: false, error: 'Payment cancelled' };
        }
        console.error('PaymentSheet present error:', presentError);
        return { success: false, error: presentError.message };
      }

      // Payment successful
      return {
        success: true,
        paymentIntentId,
        packId,
        purchaseType: purchase_type,
      };
    } catch (error: any) {
      console.error('Native payment error:', error);
      return { success: false, error: error?.response?.data?.detail || error.message };
    }
  }, [stripe]);

  const checkPaymentStatus = useCallback(async (paymentId: string) => {
    try {
      // Try payment intent status first (for native payments)
      const response = await axios.get(`${BACKEND_URL}/api/payments/intent-status/${paymentId}`);
      return response.data;
    } catch (error) {
      // Fall back to checkout session status
      try {
        const response = await axios.get(`${BACKEND_URL}/api/payments/checkout/status/${paymentId}`);
        return response.data;
      } catch (e) {
        throw error;
      }
    }
  }, []);

  const contextValue: StripePaymentContextType = {
    isNativePaymentAvailable: !!stripe,
    isInitialized,
    initiatePayment,
    checkPaymentStatus,
  };

  return (
    <StripePaymentContext.Provider value={contextValue}>
      {children}
    </StripePaymentContext.Provider>
  );
}

export function StripePaymentProvider({ children }: StripePaymentProviderProps) {
  if (!STRIPE_PUBLISHABLE_KEY) {
    console.warn('Stripe publishable key not configured');
    // Return children without Stripe wrapper
    return (
      <StripePaymentContext.Provider value={{
        isNativePaymentAvailable: false,
        isInitialized: true,
        initiatePayment: async () => ({ success: false, error: 'Stripe not configured' }),
        checkPaymentStatus: async () => ({ status: 'unknown', payment_status: 'unknown' }),
      }}>
        {children}
      </StripePaymentContext.Provider>
    );
  }

  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier="merchant.com.freqflow.app"
      urlScheme="freqflow"
    >
      <StripePaymentProviderInner>{children}</StripePaymentProviderInner>
    </StripeProvider>
  );
}
