const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isConfigured = Object.values(firebaseConfig).every(Boolean);

let appInstance = null;
let authInstance = null;
let dbInstance = null;
let modulesPromise = null;

async function loadFirebaseModules() {
  if (!modulesPromise) {
    modulesPromise = Promise.all([
      import("https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js"),
    ]).then(([app, auth, firestore]) => ({
      app,
      auth,
      firestore,
    }));
  }

  return modulesPromise;
}

async function ensureFirebase() {
  if (!isConfigured) {
    return null;
  }

  if (!appInstance) {
    const { app, auth, firestore } = await loadFirebaseModules();
    appInstance = app.initializeApp(firebaseConfig);
    authInstance = auth.getAuth(appInstance);
    dbInstance = firestore.getFirestore(appInstance);
  }

  return {
    auth: authInstance,
    db: dbInstance,
  };
}

export function isFirebaseConfigured() {
  return isConfigured;
}

export function subscribeToAuth(callback) {
  let unsubscribe = () => {};

  ensureFirebase()
    .then(async (firebase) => {
      if (!firebase) {
        callback(null);
        return;
      }

      const { auth } = await loadFirebaseModules();
      unsubscribe = auth.onAuthStateChanged(firebase.auth, callback);
    })
    .catch(() => callback(null));

  return () => unsubscribe();
}

export async function signInWithGoogle() {
  const firebase = await ensureFirebase();
  if (!firebase) {
    throw new Error("Firebase is not configured.");
  }

  const { auth } = await loadFirebaseModules();
  const provider = new auth.GoogleAuthProvider();
  const result = await auth.signInWithPopup(firebase.auth, provider);
  return result.user;
}

export async function signOutFromFirebase() {
  const firebase = await ensureFirebase();
  if (!firebase) {
    return;
  }

  const { auth } = await loadFirebaseModules();
  await auth.signOut(firebase.auth);
}

export async function pullRemoteSnapshot(uid) {
  const firebase = await ensureFirebase();
  if (!firebase || !uid) {
    return null;
  }

  const { firestore } = await loadFirebaseModules();
  const snapshotRef = firestore.doc(firebase.db, "shadow-os-users", uid);
  const remote = await firestore.getDoc(snapshotRef);
  return remote.exists() ? remote.data()?.snapshot ?? null : null;
}

export async function pushRemoteSnapshot(uid, payload) {
  const firebase = await ensureFirebase();
  if (!firebase || !uid) {
    return;
  }

  const { firestore } = await loadFirebaseModules();
  const snapshotRef = firestore.doc(firebase.db, "shadow-os-users", uid);
  await firestore.setDoc(
    snapshotRef,
    {
      snapshot: payload,
      updatedAt: firestore.serverTimestamp(),
    },
    { merge: true },
  );
}
