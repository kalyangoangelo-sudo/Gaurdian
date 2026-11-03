# Firebase Setup Guide — GuardianLink Lite

Firebase project: **guardian-link-6de8a**

---

## Step 1 — Enable Firebase Authentication

1. Go to [Firebase Console](https://console.firebase.google.com) → `guardian-link-6de8a`
2. Click **Authentication** → **Get started**
3. Enable **Email/Password** provider

---

## Step 2 — Create demo user accounts

In Firebase Console → Authentication → **Add user**:

| Email | Password | Role |
|---|---|---|
| parent@guardian.app | Parent123! | parent |
| child@guardian.app | Child123! | child |

---

## Step 3 — Enable Firestore

1. Firebase Console → **Firestore Database** → **Create database**
2. Choose **production mode** (you'll add rules next)
3. Select a region close to you

---

## Step 4 — Firestore Security Rules

Go to Firestore → **Rules** tab and paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can read their own profile
    match /users/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if request.auth != null && request.auth.uid == uid;
    }

    // Requests: child can create, parent/child can read their own
    match /requests/{requestId} {
      allow create: if request.auth != null
        && request.resource.data.childId == request.auth.uid;

      allow read: if request.auth != null
        && (resource.data.childId == request.auth.uid
            || resource.data.parentId == request.auth.uid);

      // Only the linked parent can update (decide)
      allow update: if request.auth != null
        && resource.data.parentId == request.auth.uid
        && resource.data.status == 'pending'
        && request.resource.data.status in ['approved', 'denied'];
    }
  }
}
```

---

## Step 5 — Create Firestore user profiles

For each user created in Step 2, add a document to the `/users` collection.

The document **ID must be the Firebase UID** (found in Authentication tab).

**Parent profile** (`/users/<parent-uid>`):
```json
{
  "uid": "<parent-uid>",
  "username": "parent",
  "role": "parent",
  "fcmToken": null
}
```

**Child profile** (`/users/<child-uid>`):
```json
{
  "uid": "<child-uid>",
  "username": "child",
  "role": "child",
  "parentId": "<parent-uid>",
  "fcmToken": null
}
```

> ⚠️ The `parentId` field on the child document is how GuardianLink links them.

---

## Step 6 — Firestore Index (required for queries)

Firestore needs a composite index for `requests` queries.

Go to Firestore → **Indexes** → **Composite** → **Add index**:

| Collection | Field 1 | Field 2 | Query scope |
|---|---|---|---|
| requests | childId (Ascending) | createdAt (Descending) | Collection |
| requests | parentId (Ascending) | createdAt (Descending) | Collection |

Or just run the app — Firestore will show a link in the error to create the index automatically.

---

## Step 7 — FCM Push Notifications (server)

1. Firebase Console → Project Settings → **Service Accounts**
2. Click **Generate new private key** → download JSON
3. Save as `GuardianLinkLite/server/firebase-service-account.json`
   (this file is git-ignored)
4. Install firebase-admin: `cd server && npm install`
5. Restart the server — it will log `[Firebase Admin] Initialised ✓`

---

## Step 8 — Build the mobile app

Firebase native SDK **does not work in Expo Go**.
You need a development build:

```bash
cd GuardianLinkLite/mobile

# Install EAS CLI
npm install -g eas-cli

# Login to Expo account (free)
eas login

# Configure the project
eas build:configure

# Build a development APK (installs like a normal app)
eas build --platform android --profile development
```

Or build locally with Android Studio:
```bash
npx expo prebuild --clean
npx expo run:android
```

---

## Login credentials (after setup)

| Role | Email | Password |
|---|---|---|
| Parent | parent@guardian.app | Parent123! |
| Child | child@guardian.app | Child123! |
