import admin from 'firebase-admin';
// @ts-ignore
import serviceAccount from '../serviceAccountKey.json';

// Initialize Firebase Admin SDK with service account
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    projectId: "safe-path-45055",
  });
}

export const db = admin.firestore();
export const auth = admin.auth();
