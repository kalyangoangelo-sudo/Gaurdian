/**
 * deploy-firestore-rules.js
 *
 * Deploys the correct Firestore security rules via Firebase Admin REST API.
 *
 * Alternative: paste the rules manually in the Firebase Console.
 *
 * Usage:
 *   node scripts/deploy-firestore-rules.js
 *
 * Requires: firebase-service-account.json
 */

'use strict';

// The security rules to deploy
const RULES = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can only read/write their own profile
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // Requests
    match /requests/{requestId} {
      // Child can create a request for themselves
      allow create: if request.auth != null
        && request.resource.data.childId == request.auth.uid
        && request.resource.data.status == 'pending';

      // Parent or child in this request can read it
      allow read: if request.auth != null
        && (resource.data.childId == request.auth.uid
            || resource.data.parentId == request.auth.uid);

      // Only the linked parent can update (decide) a pending request
      allow update: if request.auth != null
        && resource.data.parentId == request.auth.uid
        && resource.data.status == 'pending'
        && request.resource.data.status in ['approved', 'denied']
        && request.resource.data.childId == resource.data.childId
        && request.resource.data.parentId == resource.data.parentId
        && request.resource.data.url == resource.data.url;

      // No deletes
      allow delete: if false;
    }
  }
}
`;

console.log('\n📋 Firestore Security Rules to deploy:\n');
console.log('─'.repeat(60));
console.log(RULES);
console.log('─'.repeat(60));
console.log('\nTo deploy these rules:');
console.log('1. Go to https://console.firebase.google.com');
console.log('2. Select project: guardian-link-6de8a');
console.log('3. Firestore Database → Rules tab');
console.log('4. Replace all content with the rules above');
console.log('5. Click Publish\n');
