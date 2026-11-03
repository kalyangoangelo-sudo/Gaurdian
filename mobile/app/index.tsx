/**
 * app/index.tsx
 *
 * Entry point – redirects to /login.
 * Expo Router treats this as the "/" route.
 */

import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/login" />;
}
