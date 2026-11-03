/**
 * app/(child)/_layout.tsx
 *
 * Bottom tab navigator for the Child role.
 * 4 tabs: Home, Protection, Report, Requests
 */

import React from 'react';
import { Tabs } from 'expo-router';

const NAVY = '#1B2A4A';
const TEAL = '#00B4D8';
const GREY = '#6B7280';

export default function ChildTabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: TEAL,
        tabBarInactiveTintColor: GREY,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <TabIcon emoji="🏠" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="protection"
        options={{
          title: 'Protection',
          tabBarIcon: ({ color }) => (
            <TabIcon emoji="🛡️" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Report',
          tabBarIcon: ({ color }) => (
            <TabIcon emoji="🚨" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',
          tabBarIcon: ({ color }) => (
            <TabIcon emoji="📋" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

import { Text } from 'react-native';
import type { ColorValue } from 'react-native';

function TabIcon({ emoji, color }: { emoji: string; color: ColorValue }) {
  return (
    <Text style={{ fontSize: 20, opacity: color === TEAL ? 1 : 0.55 }}>
      {emoji}
    </Text>
  );
}
