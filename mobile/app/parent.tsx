/**
 * app/parent.tsx
 *
 * Parent dashboard route.
 * Guards against unauthenticated access and wrong role.
 */

import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import ParentDashboard from '../src/screens/ParentDashboard';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../src/styles/theme';

export default function ParentRoute() {
  const { user, token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      router.replace('/login');
      return;
    }
    if (user?.role !== 'parent') {
      // Child accidentally navigated here
      router.replace('/child');
    }
  }, [token, user, router]);

  if (!token || user?.role !== 'parent') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.backgroundPage }}>
        <ActivityIndicator color={Colors.blue} />
      </View>
    );
  }

  return <ParentDashboard />;
}
