import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from './firebaseConfig';

// Popup flow: avoids the cross-domain storage partitioning that broke
// signInWithRedirect for gmail (non-institutional) auditor accounts and removes
// the dependency on Firebase Hosting serving /__/firebase/init.json.
// Domain/auditor validation lives in AuthContext.onAuthStateChanged.
export async function signInWithGoogle(): Promise<FirebaseUser> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOut(): Promise<{ error: string | null }> {
  try {
    await firebaseSignOut(auth);
    return { error: null };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Error al cerrar sesión';
    return { error: errorMessage };
  }
}

export function onAuthStateChanged(
  callback: (user: FirebaseUser | null) => void
): () => void {
  return firebaseOnAuthStateChanged(auth, callback);
}

export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser;
}
