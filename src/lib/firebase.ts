import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFunctions, type Functions } from "firebase/functions";

function readEnv(): Record<string, string | undefined> {
  try {
    return (import.meta as unknown as { env: Record<string, string | undefined> }).env ?? {};
  } catch {
    return {};
  }
}

const env = readEnv();

export const firebaseConfig = {
  apiKey: env["VITE_FIREBASE_API_KEY"] ?? "",
  authDomain: env["VITE_FIREBASE_AUTH_DOMAIN"] ?? "",
  projectId: env["VITE_FIREBASE_PROJECT_ID"] ?? "",
  storageBucket: env["VITE_FIREBASE_STORAGE_BUCKET"] ?? "",
  messagingSenderId: env["VITE_FIREBASE_MESSAGING_SENDER_ID"] ?? "",
  appId: env["VITE_FIREBASE_APP_ID"] ?? "",
};

/** True when all required client keys are present. */
export const isFirebaseConfigured =
  !!firebaseConfig.apiKey && !!firebaseConfig.projectId && !!firebaseConfig.appId;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let functions: Functions | null = null;

if (isFirebaseConfigured) {
  app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app);
} else if (typeof window !== "undefined") {
  console.warn(
    "[firebase] VITE_FIREBASE_* keys missing — backend calls will fail until .env.local is set. See .env.example.",
  );
}

export function requireApp(): FirebaseApp {
  if (!app) throw new Error("Firebase is not configured. Add VITE_FIREBASE_* keys to .env.local.");
  return app;
}

export function requireAuth(): Auth {
  if (!auth) throw new Error("Firebase Auth is not configured. Add VITE_FIREBASE_* keys to .env.local.");
  return auth;
}

export function requireDb(): Firestore {
  if (!db) throw new Error("Firestore is not configured. Add VITE_FIREBASE_* keys to .env.local.");
  return db;
}

export function requireStorage(): FirebaseStorage {
  if (!storage) throw new Error("Firebase Storage is not configured. Add VITE_FIREBASE_* keys to .env.local.");
  return storage;
}

export function requireFunctions(): Functions {
  if (!functions) throw new Error("Cloud Functions are not configured. Add VITE_FIREBASE_* keys to .env.local.");
  return functions;
}

export { app as firebaseApp, auth as firebaseAuth, db as firestore, storage as firebaseStorage, functions as firebaseFunctions };
