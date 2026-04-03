// PaymentContext.web.tsx - Web version uses Stripe Checkout redirect

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import axios from 'axios';
import { type PremiumPackId } from '../utils/premium';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface PaymentResult {
  success: boolean;
  error?: string;
  packId?: string;
  purchaseType?: string;
}

interface PaymentContextType {
  isAppleIAP: boolean;
  isInitialized: boolean;
  products: Map<string, any>;
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
  const [isInitialized] = useState(true);

  const initiatePayment = useCallback(async (packId: PremiumPackId, returnUrl?: string): Promise<PaymentResult> => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/payments/create-checkout-session`, {
        pack_id: packId,
        return_url: returnUrl || window.location.origin + '/premium',
      });

      // Redirect to Stripe Checkout
      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
        return { success: true };
      }

      return { success: false, error: 'No checkout URL returned' };
    } catch (error: any) {
      return { success: false, error: error?.response?.data?.detail || error.message };
    }
  }, []);

  const restorePurchases = useCallback(async (): Promise<PremiumPackId[]> => {
    // Web doesn't support purchase restoration
    return [];
  }, []);

  const checkPaymentStatus = useCallback(async (paymentId: string) => {
    const response = await axios.get(`${BACKEND_URL}/api/payments/checkout/status/${paymentId}`);
    return response.data;
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
