/**
 * seed-firestore.js
 *
 * Seeds Firestore with the two demo user profiles.
 *
 * Run AFTER you have:
 *  1. Created the two Firebase Auth users in the Console
 *  2. Downloaded the service account JSON to:
 *     GuardianLinkLite/server/firebase-service-account.json
 *
 * Usage:
 *   node scripts/seed-firestore.js <parent-uid> <child-uid>
 *
 * Example:
 *   node scripts/seed-firestore.js abc123 xyz456
 *
 * You can find the UIDs in Firebase Console → Authentication → Users
 */

'use strict';

const [,, parentUid, childUid] = process.argv;

if (!parentUid || !childUid) {
  console.error('\nUsage: node scripts/seed-firestore.js <parent-uid> <child-uid>');
  console.error('Find UIDs in Firebase Console → Authentication → Users\n');
  process.exit(1);
}

const path = require('path');
const admin = require('firebase-admin');

const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');

let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch {
  console.error('\nERROR: firebase-service-account.json not found.');
  console.error('Download it from Firebase Console → Project Settings → Service Accounts → Generate new private key');
  console.error(`Expected path: ${serviceAccountPath}\n`);
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function seed() {
  console.log('\n🔥 Seeding Firestore demo user profiles...\n');

  // Parent profile
  await db.collection('users').doc(parentUid).set({
    uid: parentUid,
    username: 'parent',
    email: 'parent@guardian.app',
    role: 'parent',
    fcmToken: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log(`✅ Parent profile written → /users/${parentUid}`);

  // Child profile — parentId links child to parent
  await db.collection('users').doc(childUid).set({
    uid: childUid,
    username: 'child',
    email: 'child@guardian.app',
    role: 'child',
    parentId: parentUid,
    fcmToken: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log(`✅ Child profile written  → /users/${childUid}`);

  console.log('\n🎉 Firestore seeding complete!');
  console.log(`\n   Parent UID : ${parentUid}`);
  console.log(`   Child UID  : ${childUid}`);
  console.log('\n   Login credentials:');
  console.log('   Parent → parent@guardian.app / Parent123!');
  console.log('   Child  → child@guardian.app  / Child123!\n');

  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
