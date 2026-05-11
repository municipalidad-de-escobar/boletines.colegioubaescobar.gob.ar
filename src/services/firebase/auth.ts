import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import type { UserFirestore } from '../../types/firestore';

const INSTITUTIONAL_DOMAIN = '@colegioubaescobar.gob.ar';

interface AuthResult {
  user: FirebaseUser | null;
  userData: UserFirestore | null;
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
        userData: null,
        error: `Acceso denegado. Por favor, utiliza tu cuenta institucional ${INSTITUTIONAL_DOMAIN}`,
      };
    }

    // Verificar que el usuario existe en Firestore y está activo
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      await firebaseSignOut(auth);
      return {
        user: null,
        userData: null,
        error: 'Tu cuenta no está registrada en el sistema. Contacta al administrador.',
      };
    }

    const userData = userDocSnap.data() as UserFirestore;

    if (!userData.active) {
      await firebaseSignOut(auth);
      return {
        user: null,
        userData: null,
        error: 'Tu cuenta ha sido desactivada. Contacta al administrador.',
      };
    }

    return {
      user,
      userData,
      error: null,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Error al iniciar sesión con Google';
    return {
      user: null,
      userData: null,
      error: errorMessage,
    };
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
