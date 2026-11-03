/**
 * app/(parent)/_layout.tsx
 *
 * Bottom tab navigator for the Parent role.
 * 5 tabs: Dashboard, Children, Reports, Requests, Security
 */

import React from 'react';
import { Tabs } from 'expo-router';

const TEAL = '#00B4D8';
const GREY = '#6B7280';

export default function ParentTabLayout() {
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
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <TabIcon emoji="📊" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="children"
        options={{
          title: 'Children',
          tabBarIcon: ({ color }) => (
            <TabIcon emoji="👶" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
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
      <Tabs.Screen
        name="security"
        options={{
          title: 'Security',
          tabBarIcon: ({ color }) => (
            <TabIcon emoji="🛡️" color={color} />
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
    <Text style={{ fontSize: 18, opacity: color === TEAL ? 1 : 0.55 }}>
      {emoji}
    </Text>
  );
}
