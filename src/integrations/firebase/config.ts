/* eslint-disable @typescript-eslint/no-explicit-any */
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export function getFirebaseConfig(): FirebaseConfig | null {
  const env = (import.meta as any).env || process.env || {};
  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || env.FIREBASE_AUTH_DOMAIN || "",
    projectId: env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || "",
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || env.FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId:
      env.VITE_FIREBASE_MESSAGING_SENDER_ID || env.FIREBASE_MESSAGING_SENDER_ID || "",
    appId: env.VITE_FIREBASE_APP_ID || env.FIREBASE_APP_ID || "",
  };
}

export const IS_FIREBASE_ENABLED = getFirebaseConfig() !== null;
