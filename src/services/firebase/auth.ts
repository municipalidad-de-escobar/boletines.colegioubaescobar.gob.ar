import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from './firebaseConfig';

interface AuthResult {
  user: FirebaseUser | null;
  error: string | null;
}

export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);

    // Domain/guest validation is handled by AuthContext.onAuthStateChanged
    // as the single source of truth.
    return { user: result.user, error: null };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Error al iniciar sesión con Google';
    return { user: null, error: errorMessage };
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
