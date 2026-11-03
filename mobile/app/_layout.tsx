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
      </Stack>
    </AuthProvider>
  );
}
