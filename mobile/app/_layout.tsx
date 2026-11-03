/**
 * _layout.tsx (root layout)
 *
 * Wraps the entire app in the AuthProvider so every screen
 * can access authentication state.
 */

import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="child" />
        <Stack.Screen name="parent" />
        {/* Child screens */}
        <Stack.Screen name="child-safe-signal" />
        <Stack.Screen name="child-request-access" />
        <Stack.Screen name="child-removal-request" />
        <Stack.Screen name="child-protection-status" />
        {/* Parent screens */}
        <Stack.Screen name="parent-safe-signal-review" />
        <Stack.Screen name="parent-access-requests" />
        <Stack.Screen name="parent-removal-requests" />
        <Stack.Screen name="parent-manage-child" />
        <Stack.Screen name="parent-content-restrictions" />
        <Stack.Screen name="parent-device-security" />
      </Stack>
    </AuthProvider>
  );
}
