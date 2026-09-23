import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFunctions, type Functions } from "firebase/functions";
import appletConfig from "../../firebase-applet-config.json";

function readEnv(): Record<string, string | undefined> {
  try {
    return (import.meta as unknown as { env: Record<string, string | undefined> }).env ?? {};
  } catch {
    return {};
  }
}

const env = readEnv();

export const firebaseConfig = {
  apiKey: env["VITE_FIREBASE_API_KEY"] || appletConfig.apiKey || "",
  authDomain: env["VITE_FIREBASE_AUTH_DOMAIN"] || appletConfig.authDomain || "",
  projectId: env["VITE_FIREBASE_PROJECT_ID"] || appletConfig.projectId || "",
  storageBucket: env["VITE_FIREBASE_STORAGE_BUCKET"] || appletConfig.storageBucket || "",
  messagingSenderId:
    env["VITE_FIREBASE_MESSAGING_SENDER_ID"] || appletConfig.messagingSenderId || "",
  appId: env["VITE_FIREBASE_APP_ID"] || appletConfig.appId || "",
};

export const firestoreDatabaseId =
  env["VITE_FIREBASE_FIRESTORE_DATABASE_ID"] || appletConfig.firestoreDatabaseId || "(default)";

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
  db =
    firestoreDatabaseId && firestoreDatabaseId !== "(default)"
      ? getFirestore(app, firestoreDatabaseId)
      : getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app);

  if (typeof window !== "undefined") {
    // Validate connection to Firestore
    getDocFromServer(doc(db, "test", "connection")).catch((error) => {
      if (error instanceof Error && error.message.includes("the client is offline")) {
        console.error("Please check your Firebase configuration.");
      }
    });
  }

  // Local emulator support (dev only): set VITE_FIREBASE_AUTH_EMULATOR_HOST
  // (e.g. 127.0.0.1:9099) and VITE_FIREBASE_FIRESTORE_EMULATOR_HOST
  // (e.g. 127.0.0.1:8090) to point the app at the Emulator Suite.
  if (typeof window !== "undefined" && import.meta.env.DEV) {
    const authHost = env["VITE_FIREBASE_AUTH_EMULATOR_HOST"];
    const fsHost = env["VITE_FIREBASE_FIRESTORE_EMULATOR_HOST"];
    if (authHost) {
      const [h, p] = authHost.split(":");
      import("firebase/auth").then(({ connectAuthEmulator }) =>
        connectAuthEmulator(auth!, `http://${h}:${p || "9099"}`, { disableWarnings: true }),
      );
    }
    if (fsHost) {
      const [h, p] = fsHost.split(":");
      import("firebase/firestore").then(({ connectFirestoreEmulator }) =>
        connectFirestoreEmulator(db!, h || "127.0.0.1", Number(p || "8090")),
      );
    }
  }
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
  if (!auth)
    throw new Error("Firebase Auth is not configured. Add VITE_FIREBASE_* keys to .env.local.");
  return auth;
}

export function requireDb(): Firestore {
  if (!db) throw new Error("Firestore is not configured. Add VITE_FIREBASE_* keys to .env.local.");
  return db;
}

export function requireStorage(): FirebaseStorage {
  if (!storage)
    throw new Error("Firebase Storage is not configured. Add VITE_FIREBASE_* keys to .env.local.");
  return storage;
}

export function requireFunctions(): Functions {
  if (!functions)
    throw new Error("Cloud Functions are not configured. Add VITE_FIREBASE_* keys to .env.local.");
  return functions;
}

export {
  app as firebaseApp,
  auth as firebaseAuth,
  db as firestore,
  storage as firebaseStorage,
  functions as firebaseFunctions,
};
