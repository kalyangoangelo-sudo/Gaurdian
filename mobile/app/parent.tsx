/**
 * app/parent.tsx
 *
 * Legacy route — redirects to the new tab group.
 */

import { Redirect } from 'expo-router';

export default function ParentRoute() {
  return <Redirect href="/(parent)/dashboard" />;
}
