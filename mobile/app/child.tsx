/**
 * app/child.tsx
 *
 * Legacy route — redirects to the new tab group.
 */

import { Redirect } from 'expo-router';

export default function ChildRoute() {
  return <Redirect href="/(child)/home" />;
}
