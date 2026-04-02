import React from 'react';
import LegalInfoScreen from '../src/screens/LegalInfoScreen';
import { APP_NAME } from '../src/constants/brand';

export default function PrivacyRoute() {
  return (
    <LegalInfoScreen
      title="Privacy Policy"
      subtitle={`${APP_NAME} keeps the free core simple and stores premium unlocks locally on your device.`}
      sections={[
        {
          title: 'What we store',
          body: 'Tasks, local premium unlock state, and your trial timer are stored on your device so the app can keep working without an account.',
        },
        {
          title: 'Voice and AI',
          body: 'When you choose to use Flow AI voice features, audio is sent only for transcription and response handling. It is not kept as a permanent library inside the app.',
        },
        {
          title: 'Payments',
          body: 'Payments are processed securely by Stripe checkout. Card details are never stored by the app.',
        },
      ]}
    />
  );
}