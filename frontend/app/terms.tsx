import React from 'react';
import LegalInfoScreen from '../src/screens/LegalInfoScreen';
import { APP_NAME } from '../src/constants/brand';

export default function TermsRoute() {
  return (
    <LegalInfoScreen
      title="Terms of Use"
      subtitle={`Use ${APP_NAME} responsibly as a wellness companion, not as medical advice.`}
      sections={[
        {
          title: 'Wellness only',
          body: 'The app is designed for wellness, focus, and relaxation support. It is not a replacement for medical, mental health, or emergency care.',
        },
        {
          title: 'Premium purchases',
          body: 'Premium packs are one-time purchases. Lifetime unlock covers current and future premium add-ons in this app experience.',
        },
        {
          title: 'Core access',
          body: 'Basic tones, tasks, and Flow AI core usage remain free. Premium only adds special locked packs and related wellness extras.',
        },
      ]}
    />
  );
}