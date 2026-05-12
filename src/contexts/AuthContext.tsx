import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
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
import { isReadOnlyRole, type UserRole } from '../types/roles';
import {
  INSTITUTIONAL_DOMAIN,
  isAuditorEmail,
  isInstitutionalEmail,
} from '../config/auditors';

const VALID_ROLES: readonly UserRole[] = [
  'admin',
  'profesor',
  'coordinador',
  'jefe_coordinacion',
  'regente',
  'secretaria',
  'directivo',
  'auditor',
];

interface AuthContextType {
  user: FirebaseUser | null;
  userData: UserFirestore | null;
  cicloLectivoActivo: CicloLectivoFirestore | null;
  loading: boolean;
  error: string | null;
  isReadOnly: boolean;
  isAuditor: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export interface AuthProviderProps {
  children: React.ReactNode;
}

// ----------------------------------------------------------------------------
// Synthetic auditor profile
// Auditors don't need a Firestore `users` document. We synthesize one in-memory
// based on their Firebase Auth profile so the rest of the app can keep reading
// userData uniformly.
// ----------------------------------------------------------------------------
function buildAuditorProfile(firebaseUser: FirebaseUser): UserFirestore {
  const displayName = firebaseUser.displayName ?? firebaseUser.email ?? 'Auditor/a';
  const [firstName = 'Auditor/a', ...rest] = displayName.split(' ');
  const lastName = rest.join(' ') || 'Externo/a';
  const now = Timestamp.now();
  return {
    displayName,
    firstName,
    lastName,
    email: firebaseUser.email ?? '',
    role: 'auditor',
    active: true,
    createdAt: now,
    updatedAt: now,
    photoURL: firebaseUser.photoURL ?? undefined,
  };
}

export function AuthProvider({ children }: AuthProviderProps): React.ReactNode {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserFirestore | null>(null);
  const [cicloLectivoActivo, setCicloLectivoActivo] =
    useState<CicloLectivoFirestore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    setLoading(true);

    const reject = async (msg: string, logCtx?: unknown) => {
      if (logCtx !== undefined) console.warn(msg, logCtx);
      await signOut();
      setUser(null);
      setUserData(null);
      setError(msg);
      setLoading(false);
    };

    const unsubscribe = onAuthStateChanged(async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          setUser(null);
          setUserData(null);
          setError(null);
          setLoading(false);
          return;
        }

        const email = firebaseUser.email;

        // ---- Auditor bypass --------------------------------------------------
        // Specific Gmail accounts get read-only access without a Firestore user
        // document. They are short-circuited here before any other lookups.
        if (isAuditorEmail(email)) {
          setUser(firebaseUser);
          setUserData(buildAuditorProfile(firebaseUser));
          setError(null);
          setLoading(false);
          return;
        }

        // ---- Institutional domain gate ---------------------------------------
        if (!isInstitutionalEmail(email)) {
          await reject(
            `Solo se permite el acceso con una cuenta institucional @${INSTITUTIONAL_DOMAIN}.`,
            email,
          );
          return;
        }

        // ---- Existing user --------------------------------------------------
        const userDoc = await getUserById(firebaseUser.uid);

        if (userDoc) {
          if (!userDoc.active) {
            await reject('Usuario desactivado. Contactá al administrador.', firebaseUser.uid);
            return;
          }
          if (!VALID_ROLES.includes(userDoc.role)) {
            await reject('Rol de usuario inválido. Contactá al administrador.', userDoc.role);
            return;
          }
          setUser(firebaseUser);
          setUserData(userDoc);
          setError(null);
          setLoading(false);
          return;
        }

        // ---- Pending profesor (auto-provision) -------------------------------
        const pendientesQuery = query(
          collection(db, 'profesoresPendientes'),
          where('email', '==', email),
        );
        const pendientesSnapshot = await getDocs(pendientesQuery);

        if (pendientesSnapshot.empty) {
          await reject(
            'Usuario no registrado en el sistema. Contactá al administrador.',
            email,
          );
          return;
        }

        const pendienteDoc = pendientesSnapshot.docs[0];
        const pendienteData = pendienteDoc.data();
        const pendienteRole = pendienteData?.role as string | undefined;

        if (!pendienteRole || !VALID_ROLES.includes(pendienteRole as UserRole)) {
          await reject(
            'Configuración de usuario inválida. Contactá al administrador.',
            pendienteRole,
          );
          return;
        }

        const now = Timestamp.now();
        const newUserData: UserFirestore = {
          displayName: firebaseUser.displayName ?? email ?? 'Usuario',
          firstName: pendienteData.firstName as string,
          lastName: pendienteData.lastName as string,
          email: pendienteData.email as string,
          role: pendienteRole as UserRole,
          active: Boolean(pendienteData.active),
          createdAt: now,
          updatedAt: now,
        };

        await setDoc(doc(db, 'users', firebaseUser.uid), newUserData);
        await deleteDoc(pendienteDoc.ref);

        setUser(firebaseUser);
        setUserData(newUserData);
        setError(null);
        setLoading(false);
      } catch (err) {
        console.error('Error in onAuthStateChanged handler:', err);
        await reject('Error al autenticar usuario. Probá nuevamente.');
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextType>(() => {
    const role = userData?.role ?? null;
    return {
      user,
      userData,
      cicloLectivoActivo,
      loading,
      error,
      isReadOnly: isReadOnlyRole(role),
      isAuditor: role === 'auditor',
    };
  }, [user, userData, cicloLectivoActivo, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
