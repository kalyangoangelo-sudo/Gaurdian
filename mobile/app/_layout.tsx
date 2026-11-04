/**
 * _layout.tsx (root layout)
 *
 * Wraps the entire app in the AuthProvider so every screen
 * can access authentication state.
 *
 * SplashScreen.hideAsync() is called after the layout mounts so the
 * native splash does not block on every navigation event.
 */

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '../src/context/AuthContext';

// Keep the native splash visible until we explicitly dismiss it
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    // Hide the native splash once the JS bundle and layout have mounted
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        {/* Entry / role selection */}
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />

        {/* Tab group navigators */}
        <Stack.Screen name="(child)" />
        <Stack.Screen name="(parent)" />

        {/* Legacy flat routes (kept for backward compatibility) */}
        <Stack.Screen name="child" />
        <Stack.Screen name="parent" />

        {/* Child detail screens */}
        <Stack.Screen name="child-safe-signal" />
        <Stack.Screen name="child-request-access" />
        <Stack.Screen name="child-removal-request" />
        <Stack.Screen name="child-protection-status" />

        {/* Parent detail screens */}
        <Stack.Screen name="parent-safe-signal-review" />
        <Stack.Screen name="parent-access-requests" />
        <Stack.Screen name="parent-removal-requests" />
        <Stack.Screen name="parent-manage-child" />
        <Stack.Screen name="parent-content-restrictions" />
        <Stack.Screen name="parent-device-security" />

        {/* SafeReport public screens */}
        <Stack.Screen name="public-report" />
        <Stack.Screen name="case-status" />

        {/* Caseworker portal */}
        <Stack.Screen name="caseworker-login" />
        <Stack.Screen name="caseworker-dashboard" />
        <Stack.Screen name="case-detail" />
        <Stack.Screen name="evidence" />

        {/* Commercial */}
        <Stack.Screen name="commercial" />

        {/* Teacher institutional report */}
        <Stack.Screen name="teacher-report" />
      </Stack>
    </AuthProvider>
  );
}
