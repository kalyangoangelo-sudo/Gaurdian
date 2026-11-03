/**
 * create-indexes.js
 *
 * Creates the required Firestore composite indexes via the Admin SDK.
 *
 * Required indexes:
 *   requests: childId ASC + createdAt DESC
 *   requests: parentId ASC + createdAt DESC
 *
 * Usage:
 *   node scripts/create-indexes.js
 *
 * NOTE: Index creation can take 2-5 minutes to complete.
 * You can also create them manually at:
 * https://console.firebase.google.com/project/guardian-link-6de8a/firestore/indexes
 */

'use strict';

const path = require('path');
const https = require('https');
const admin = require('firebase-admin');

const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');

let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch {
  console.error('\nERROR: firebase-service-account.json not found.');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

async function createIndexes() {
  const projectId = serviceAccount.project_id;

  console.log('\n📊 Creating Firestore composite indexes...');
  console.log(`   Project: ${projectId}\n`);

  // Get access token
  const token = await admin.app().options.credential.getAccessToken();

  const indexes = [
    {
      name: 'requests: childId + createdAt',
      fields: [
        { fieldPath: 'childId', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' },
      ],
    },
    {
      name: 'requests: parentId + createdAt',
      fields: [
        { fieldPath: 'parentId', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' },
      ],
    },
  ];

  for (const index of indexes) {
    const body = JSON.stringify({
      queryScope: 'COLLECTION',
      fields: index.fields,
    });

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/collectionGroups/requests/indexes`;

    await new Promise((resolve) => {
      const req = https.request(
        url,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token.access_token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            const parsed = JSON.parse(data);
            if (res.statusCode === 200 || res.statusCode === 409) {
              // 409 = already exists
              const state = parsed.state ?? (res.statusCode === 409 ? 'ALREADY EXISTS' : 'CREATING');
              console.log(`✅ ${index.name} → ${state}`);
            } else {
              console.log(`⚠️  ${index.name} → HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`);
            }
            resolve();
          });
        }
      );
      req.on('error', (err) => {
        console.log(`❌ ${index.name} → ${err.message}`);
        resolve();
      });
      req.write(body);
      req.end();
    });
  }

  console.log('\n⏳ Indexes take 2-5 minutes to build after creation.');
  console.log('   Check status: Firebase Console → Firestore → Indexes\n');
  process.exit(0);
}

createIndexes().catch(err => {
  console.error('Index creation failed:', err);
  process.exit(1);
});
