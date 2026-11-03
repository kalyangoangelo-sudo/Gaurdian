# Firebase Quick-Start (5 minutes)

## 1. Enable Email/Password Auth

1. Go to https://console.firebase.google.com
2. Select project: **guardian-link-6de8a**
3. Click **Authentication** → **Get started** (or it may already be enabled)
4. Go to **Sign-in method** tab
5. Enable **Email/Password**
6. Click **Save**

---

## 2. Create demo user accounts

In **Authentication** → **Users** tab → click **Add user**:

### Parent:
- **Email**: `parent@guardian.app`
- **Password**: `Parent123!`

### Child:
- **Email**: `child@guardian.app`
- **Password**: `Child123!`

After creating both users, copy their **User UIDs** from the table. You need them for the next steps.

---

## 3. Create Firestore database

1. Go to **Firestore Database** in the left sidebar
2. Click **Create database**
3. Select **production mode**
4. Choose a region close to you (can't change later)
5. Click **Enable**

---

## 4. Deploy security rules

1. In Firestore → **Rules** tab
2. Replace all content with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /requests/{requestId} {
      allow create: if request.auth != null
        && request.resource.data.childId == request.auth.uid
        && request.resource.data.status == 'pending';
      allow read: if request.auth != null
        && (resource.data.childId == request.auth.uid
            || resource.data.parentId == request.auth.uid);
      allow update: if request.auth != null
        && resource.data.parentId == request.auth.uid
        && resource.data.status == 'pending'
        && request.resource.data.status in ['approved', 'denied']
        && request.resource.data.childId == resource.data.childId
        && request.resource.data.parentId == resource.data.parentId
        && request.resource.data.url == resource.data.url;
      allow delete: if false;
    }
  }
}
```

3. Click **Publish**

---

## 5. Download service account key

1. Go to **Project Settings** (gear icon top-left)
2. **Service Accounts** tab
3. Click **Generate new private key**
4. Save the JSON file as:
   `GuardianLinkLite/server/firebase-service-account.json`
   (already git-ignored)

---

## 6. Seed Firestore user profiles

Open a terminal and run:

```bash
cd GuardianLinkLite/server
npm install

# Replace <PARENT_UID> and <CHILD_UID> with the actual UIDs from step 2
node scripts/seed-firestore.js <PARENT_UID> <CHILD_UID>
```

Example:
```bash
node scripts/seed-firestore.js abc123xyz456 def789ghi012
```

This creates the `/users` documents that link the child to the parent.

---

## 7. Create Firestore indexes

```bash
node scripts/create-indexes.js
```

Indexes take 2-5 minutes to build.

---

## Done!

Your Firebase backend is now fully configured.

**Login credentials:**

| Role | Email | Password |
|---|---|---|
| Parent | parent@guardian.app | Parent123! |
| Child | child@guardian.app | Child123! |
