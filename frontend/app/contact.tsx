import React from 'react';
import LegalInfoScreen from '../src/screens/LegalInfoScreen';
import { SUPPORT_EMAIL } from '../src/constants/brand';

export default function ContactRoute() {
  return (
    <LegalInfoScreen
      title="Contact & Help"
      subtitle="Need support with purchases, premium access, or Flow AI? Reach out directly."
      ctaLabel={`Email ${SUPPORT_EMAIL}`}
      ctaType="email"
      sections={[
        {
          title: 'Payment help',
          body: 'If checkout opens but you need help after purchase, email support and include your device details plus what pack you bought.',
        },
        {
          title: 'Audio & AI help',
          body: 'For playback, reminder, or Flow AI issues, send a quick note with what you tapped and what happened so support can respond faster.',
        },
      ]}
    />
  );
}