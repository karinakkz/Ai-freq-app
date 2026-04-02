import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StripePaymentProvider } from '../src/contexts/StripePaymentContext';

const COLORS = {
  background: '#050510',
  surface: '#0d1117',
  cyan: '#00ccff',
  emerald: '#2ecc71',
  textSecondary: '#484f58',
  deepBlue: '#0044cc',
};

function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.cyan,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.deepBlue + '40',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        headerStyle: {
          backgroundColor: COLORS.background,
          borderBottomColor: COLORS.deepBlue + '30',
          borderBottomWidth: 1,
        },
        headerTintColor: COLORS.cyan,
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 17,
        },
        tabBarLabelStyle: {
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "AI Freq's",
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? 'home' : 'home-outline'} 
              size={size - 2} 
              color={color} 
            />
          ),
          tabBarLabel: 'Home',
        }}
      />
      <Tabs.Screen
        name="frequencies"
        options={{
          title: 'Frequencies',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? 'musical-notes' : 'musical-notes-outline'} 
              size={size - 2} 
              color={color} 
            />
          ),
          tabBarLabel: 'Heal',
        }}
      />
      <Tabs.Screen
        name="voice"
        options={{
          title: "AI Freq's",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? 'mic' : 'mic-outline'} 
              size={size - 2} 
              color={color} 
            />
          ),
          tabBarLabel: 'Voice',
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'My Tasks',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? 'list' : 'list-outline'} 
              size={size - 2} 
              color={color} 
            />
          ),
          tabBarLabel: 'Tasks',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? 'settings' : 'settings-outline'} 
              size={size - 2} 
              color={color} 
            />
          ),
          tabBarLabel: 'Settings',
        }}
      />
      <Tabs.Screen
        name="premium"
        options={{
          title: 'Premium Packs',
          href: null,
        }}
      />
      <Tabs.Screen
        name="privacy"
        options={{
          title: 'Privacy Policy',
          href: null,
        }}
      />
      <Tabs.Screen
        name="terms"
        options={{
          title: 'Terms of Use',
          href: null,
        }}
      />
      <Tabs.Screen
        name="contact"
        options={{
          title: 'Contact & Help',
          href: null,
        }}
      />
      <Tabs.Screen
        name="mood"
        options={{
          title: 'Mood Analyzer',
          href: null,
        }}
      />
    </Tabs>
  );
}

export default function RootLayout() {
  return (
    <StripePaymentProvider>
      <TabLayout />
    </StripePaymentProvider>
  );
}
