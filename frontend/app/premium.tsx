import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import PremiumPacksScreen from '../src/screens/PremiumPacksScreen';

export default function PremiumRoute() {
  const params = useLocalSearchParams();
  return <PremiumPacksScreen {...params} />;
}