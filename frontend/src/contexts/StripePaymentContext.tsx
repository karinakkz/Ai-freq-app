// Web-only version of Stripe Payment Context
// This file is used when building for web platform

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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

export function StripePaymentProvider({ children }: StripePaymentProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setIsInitialized(true);
  }, []);

  const initiatePayment = useCallback(async (packId: string, returnUrl: string): Promise<PaymentResult> => {
    try {
      // Use Checkout Session for web
      const response = await axios.post(`${BACKEND_URL}/api/payments/checkout/session`, {
        pack_id: packId,
        return_url: returnUrl,
      });

      const { session_id, url } = response.data;

      if (typeof window !== 'undefined') {
        window.location.href = url;
        return { success: true, paymentIntentId: session_id, packId };
      }

      return { success: false, error: 'Web environment not available' };
    } catch (error: any) {
      console.error('Web payment error:', error);
      return { success: false, error: error?.response?.data?.detail || error.message };
    }
  }, []);

  const checkPaymentStatus = useCallback(async (paymentId: string) => {
    // Use checkout session status for web
    const response = await axios.get(`${BACKEND_URL}/api/payments/checkout/status/${paymentId}`);
    return response.data;
  }, []);

  const contextValue: StripePaymentContextType = {
    isNativePaymentAvailable: false,
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
