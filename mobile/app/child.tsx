/**
 * app/child.tsx
 *
 * Child dashboard route.
 * Guards against unauthenticated access and wrong role.
 */

import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import ChildDashboard from '../src/screens/ChildDashboard';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../src/styles/theme';

export default function ChildRoute() {
  const { user, token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      router.replace('/login');
      return;
    }
    if (user?.role !== 'child') {
      // Parent accidentally navigated here
      router.replace('/parent');
    }
  }, [token, user, router]);

  if (!token || user?.role !== 'child') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.backgroundPage }}>
        <ActivityIndicator color={Colors.blue} />
      </View>
    );
  }

  return <ChildDashboard />;
}
