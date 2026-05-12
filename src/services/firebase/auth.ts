import {
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from './firebaseConfig';

export async function signInWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider();
  await signInWithRedirect(auth, provider);
}

export async function handleGoogleRedirect(): Promise<{ error: string | null }> {
  try {
    await getRedirectResult(auth);
    // Domain/guest validation is handled by AuthContext.onAuthStateChanged
    // as the single source of truth.
    return { error: null };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Error al iniciar sesión con Google';
    return { error: errorMessage };
  }
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
