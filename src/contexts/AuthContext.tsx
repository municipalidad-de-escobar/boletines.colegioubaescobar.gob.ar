import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from '../services/firebase/auth';
import { db } from '../services/firebase/firebaseConfig';
import { getUserById, getCicloLectivoActivo } from '../services/firebase/firestore';
import type { UserFirestore, CicloLectivoFirestore } from '../types/firestore';
import type { UserRole } from '../types/roles';

const VALID_ROLES: readonly UserRole[] = [
  'admin', 'profesor', 'coordinador', 'jefe_coordinacion', 'regente', 'secretaria', 'directivo',
];

// ============================================================================
// TYPES
// ============================================================================

interface AuthContextType {
  user: FirebaseUser | null;
  userData: UserFirestore | null;
  cicloLectivoActivo: CicloLectivoFirestore | null;
  loading: boolean;
  error: string | null;
}

// ============================================================================
// CONTEXT
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.ReactNode {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserFirestore | null>(null);
  const [cicloLectivoActivo, setCicloLectivoActivo] = useState<CicloLectivoFirestore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  

  // Load ciclo lectivo activo once on mount
  useEffect(() => {
    const loadCiclo = async () => {
      try {
        const ciclo = await getCicloLectivoActivo();
        setCicloLectivoActivo(ciclo);
      } catch (err) {
        console.error('Error loading ciclo lectivo:', err);
        setError('No se pudo cargar el ciclo lectivo activo');
      }
    };

    loadCiclo();
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    setLoading(true);

    const unsubscribe = onAuthStateChanged(async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          // No authenticated user
          setUser(null);
          setUserData(null);
          setError(null);
          setLoading(false);
          return;
        }

        // Verify email domain or active guest access
        const isInstitutionalDomain = firebaseUser.email?.endsWith('@colegioubaescobar.gob.ar');

        if (!isInstitutionalDomain) {
          const guestQuery = query(
            collection(db, 'guestAccess'),
            where('email', '==', firebaseUser.email)
          );
          const guestSnapshot = await getDocs(guestQuery);
          const now = Timestamp.now();
          const hasValidGuest = guestSnapshot.docs.some(
            (d) => (d.data().expiresAt as ReturnType<typeof Timestamp.now>)?.toMillis() > now.toMillis()
          );

          if (!hasValidGuest) {
            console.warn('Invalid email domain:', firebaseUser.email);
            await signOut();
            setUser(null);
            setUserData(null);
            setError('El email debe pertenecer al dominio @colegioubaescobar.gob.ar');
            setLoading(false);
            return;
          }
        }

        // Fetch user document from Firestore
        const userDoc = await getUserById(firebaseUser.uid);

        if (!userDoc) {
          // User document not found, check profesoresPendientes
          console.warn('User document not found, checking profesoresPendientes:', firebaseUser.uid);
          
          try {
            const q = query(
              collection(db, 'profesoresPendientes'),
              where('email', '==', firebaseUser.email)
            );
            const pendientesSnapshot = await getDocs(q);

            if (pendientesSnapshot.empty) {
              // No pending profesor found
              console.warn('No pending profesor found for email:', firebaseUser.email);
              await signOut();
              setUser(null);
              setUserData(null);
              setError('Usuario no registrado en el sistema. Contactá al administrador.');
              setLoading(false);
              return;
            }

            // Found pending profesor, create user document
            const pendienteDoc = pendientesSnapshot.docs[0];
            const pendienteData = pendienteDoc.data();
            const pendienteRole = pendienteData?.role as string | undefined;

            if (!pendienteRole || !VALID_ROLES.includes(pendienteRole as UserRole)) {
              console.error('Invalid role in profesoresPendientes:', pendienteRole);
              await signOut();
              setUser(null);
              setUserData(null);
              setError('Configuración de usuario inválida. Contactá al administrador.');
              setLoading(false);
              return;
            }

            const newUserData: UserFirestore = {
              displayName: firebaseUser.displayName ?? firebaseUser.email ?? 'Usuario',
              firstName: pendienteData.firstName as string,
              lastName: pendienteData.lastName as string,
              email: pendienteData.email as string,
              role: pendienteRole as UserRole,
              active: Boolean(pendienteData.active),
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            };

            // Create user document
            const userRef = doc(db, 'users', firebaseUser.uid);
            await setDoc(userRef, newUserData);

            // Delete from profesoresPendientes
            await deleteDoc(pendienteDoc.ref);

            console.log('Profesor registrado exitosamente:', firebaseUser.uid);

            // All checks passed
            setUser(firebaseUser);
            setUserData(newUserData);
            setError(null);
            setLoading(false);
          } catch (err) {
            console.error('Error processing pending profesor:', err);
            await signOut();
            setUser(null);
            setUserData(null);
            setError('Error al registrar usuario. Contactá al administrador.');
            setLoading(false);
          }
          return;
        }

        // Verify active status
        if (!userDoc.active) {
          console.warn('User is not active:', firebaseUser.uid);
          await signOut();
          setUser(null);
          setUserData(null);
          setError('Usuario desactivado. Contacte al administrador.');
          setLoading(false);
          return;
        }

        // All checks passed
        setUser(firebaseUser);
        setUserData(userDoc);
        setError(null);
        setLoading(false);
      } catch (err) {
        console.error('Error in onAuthStateChanged handler:', err);
        setUser(null);
        setUserData(null);
        setError('Error al autenticar usuario');
        setLoading(false);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    user,
    userData,
    cicloLectivoActivo,
    loading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
