import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from './firebaseConfig';

const INSTITUTIONAL_DOMAIN = '@colegioubaescobar.gob.ar';

interface AuthResult {
  user: FirebaseUser | null;
  error: string | null;
}

const validateInstitutionalEmail = (email: string): boolean => {
  return email.endsWith(INSTITUTIONAL_DOMAIN);
};

export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      hd: 'colegioubaescobar.gob.ar',
    });

    const result = await signInWithPopup(auth, provider);
    const { user } = result;

    if (!user.email || !validateInstitutionalEmail(user.email)) {
      await firebaseSignOut(auth);
      return {
        user: null,
        error: `Acceso denegado. Por favor, utiliza tu cuenta institucional ${INSTITUTIONAL_DOMAIN}`,
      };
    }

    // All other validation (Firestore user exists, active, profesoresPendientes)
    // is handled by AuthContext.onAuthStateChanged as the single source of truth.
    return { user, error: null };
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
