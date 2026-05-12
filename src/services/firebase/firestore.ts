import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import type {
  UserFirestore,
  CursoFirestore,
  MateriaFirestore,
  AlumnoFirestore,
  HistorialCursoFirestore,
  AsignacionFirestore,
  CalificacionFirestore,
  InasistenciaFirestore,
  SancionFirestore,
  CicloLectivoFirestore,
  ConfigInstitucional,
} from '../../types/firestore';

// ============================================================================
// CICLO LECTIVO
// ============================================================================

export async function getCicloLectivoActivo(): Promise<CicloLectivoFirestore | null> {
  try {
    const q = query(
      collection(db, 'ciclosLectivos'),
      where('estado', '==', 'activo')
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    return snapshot.docs[0].data() as CicloLectivoFirestore;
  } catch (error) {
    console.error('Error fetching active ciclo lectivo:', error);
    throw error;
  }
}

export async function updateCicloLectivo(
  anio: number,
  data: Partial<CicloLectivoFirestore>
): Promise<void> {
  try {
    const docRef = doc(db, 'ciclosLectivos', String(anio));
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating ciclo lectivo:', error);
    throw error;
  }
}

export async function cerrarCicloLectivo(
  anio: number,
  userId: string
): Promise<void> {
  try {
    const docRef = doc(db, 'ciclosLectivos', String(anio));
    await updateDoc(docRef, {
      estado: 'cerrado',
      fechaCierre: Timestamp.now(),
      cerradoPor: doc(db, 'users', userId),
      periodoHabilitado: 'cerrado',
      updatedAt: Timestamp.now(),
      updatedByRef: doc(db, 'users', userId),
    });
  } catch (error) {
    console.error('Error closing ciclo lectivo:', error);
    throw error;
  }
}

// ============================================================================
// CURSOS
// ============================================================================

export async function getCursos(): Promise<(CursoFirestore & { id: string })[]> {
  try {
    const q = query(
      collection(db, 'cursos'),
      where('active', '==', true),
      orderBy('year', 'asc'),
      orderBy('division', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data() as CursoFirestore,
    }));
  } catch (error) {
    console.error('Error fetching cursos:', error);
    throw error;
  }
}
// ============================================================================
// MATERIAS
// ============================================================================

export async function getMateriasByCurso(cursoId: string): Promise<(MateriaFirestore & { id: string })[]> {
  try {
    const q = query(
      collection(db, 'cursos', cursoId, 'materias'),
      where('active', '==', true),
      orderBy('orden', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as MateriaFirestore) }));
  } catch (error) {
    console.error('Error fetching materias:', error);
    throw error;
  }
}

export async function addMateria(
  cursoId: string,
  data: Omit<MateriaFirestore, 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const materiaRef = doc(collection(db, 'cursos', cursoId, 'materias'));
    await setDoc(materiaRef, {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return materiaRef.id;
  } catch (error) {
    console.error('Error adding materia:', error);
    throw error;
  }
}

export async function updateMateria(
  cursoId: string,
  materiaId: string,
  data: Partial<MateriaFirestore>
): Promise<void> {
  try {
    const docRef = doc(db, 'cursos', cursoId, 'materias', materiaId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating materia:', error);
    throw error;
  }
}

export async function deleteMateria(cursoId: string, materiaId: string): Promise<void> {
  try {
    const docRef = doc(db, 'cursos', cursoId, 'materias', materiaId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting materia:', error);
    throw error;
  }
}

// ============================================================================
// ALUMNOS
// ============================================================================

export async function getAlumnosByCurso(
  cursoId: string,
  anioLectivo: number
): Promise<(AlumnoFirestore & { id: string })[]> {
  try {
    const q = query(
      collectionGroup(db, 'historialCursos'),
      where('cursoRef', '==', doc(db, 'cursos', cursoId)),
      where('anioLectivo', '==', anioLectivo),
      where('estado', '==', 'activo')
    );
    const historialSnapshot = await getDocs(q);

    const alumnosConCurso = [];

    for (const historialDoc of historialSnapshot.docs) {
      const alumnoId = historialDoc.ref.parent.parent?.id;
      if (!alumnoId) continue;

      const alumnoDocRef = doc(db, 'alumnos', alumnoId);
      const alumnoDocSnap = await getDoc(alumnoDocRef);

      if (alumnoDocSnap.exists()) {
        alumnosConCurso.push({
          id: alumnoDocSnap.id,
          ...alumnoDocSnap.data(),
        } as AlumnoFirestore & { id: string });
      }
    }

    return alumnosConCurso.sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(
        `${b.lastName} ${b.firstName}`
      )
    );
  } catch (error) {
    console.error('Error fetching alumnos by curso:', error);
    throw error;
  }
}

export async function getAlumnoById(alumnoId: string): Promise<(AlumnoFirestore & { id: string }) | null> {
  try {
    const docRef = doc(db, 'alumnos', alumnoId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as AlumnoFirestore & { id: string };
  } catch (error) {
    console.error('Error fetching alumno:', error);
    throw error;
  }
}

export async function addAlumno(
  data: Omit<AlumnoFirestore, 'createdAt' | 'updatedAt'>,
  cursoId: string,
  anioLectivo: number
): Promise<string> {
  try {
    const alumnoRef = doc(collection(db, 'alumnos'));
    await setDoc(alumnoRef, {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Agregar historial de curso
    const historialRef = doc(
      collection(db, 'alumnos', alumnoRef.id, 'historialCursos')
    );
    await setDoc(historialRef, {
      anioLectivo,
      cursoRef: doc(db, 'cursos', cursoId),
      estado: 'activo',
      updatedAt: Timestamp.now(),
    } as HistorialCursoFirestore);

    return alumnoRef.id;
  } catch (error) {
    console.error('Error adding alumno:', error);
    throw error;
  }
}

export async function updateAlumno(
  alumnoId: string,
  data: Partial<AlumnoFirestore>
): Promise<void> {
  try {
    const docRef = doc(db, 'alumnos', alumnoId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating alumno:', error);
    throw error;
  }
}

export async function transferirAlumno(
  alumnoId: string,
  nuevoCursoId: string,
  anioLectivo: number
): Promise<void> {
  try {
    const historialRef = doc(
      db,
      'alumnos',
      alumnoId,
      'historialCursos',
      String(anioLectivo)
    );
    await updateDoc(historialRef, {
      cursoRef: doc(db, 'cursos', nuevoCursoId),
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error transferring alumno:', error);
    throw error;
  }
}

// ============================================================================
// ASIGNACIONES
// ============================================================================

export async function getAsignacionesByProfesor(
  profesorId: string,
  anioLectivo: number
): Promise<(AsignacionFirestore & { id: string })[]> {
  try {
    const q = query(
      collection(db, 'asignaciones'),
      where('profesorRef', '==', doc(db, 'users', profesorId)),
      where('anioLectivo', '==', anioLectivo),
      where('active', '==', true)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Array<AsignacionFirestore & { id: string }>;
  } catch (error) {
    console.error('Error fetching asignaciones by profesor:', error);
    throw error;
  }
}

export async function getAsignacionesByCursoMateria(
  cursoId: string,
  materiaId: string,
  anioLectivo: number
): Promise<(AsignacionFirestore & { id: string })[]> {
  try {
    const q = query(
      collection(db, 'asignaciones'),
      where('cursoRef', '==', doc(db, 'cursos', cursoId)),
      where('materiaRef', '==', doc(db, 'cursos', cursoId, 'materias', materiaId)),
      where('anioLectivo', '==', anioLectivo),
      where('active', '==', true)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Array<AsignacionFirestore & { id: string }>;
  } catch (error) {
    console.error('Error fetching asignaciones by curso-materia:', error);
    throw error;
  }
}

export async function addAsignacion(
  data: Omit<AsignacionFirestore, 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const asignacionRef = doc(collection(db, 'asignaciones'));
    await setDoc(asignacionRef, {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return asignacionRef.id;
  } catch (error) {
    console.error('Error adding asignacion:', error);
    throw error;
  }
}

export async function cerrarAsignacion(asignacionId: string): Promise<void> {
  try {
    const docRef = doc(db, 'asignaciones', asignacionId);
    await updateDoc(docRef, {
      active: false,
      hasta: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error closing asignacion:', error);
    throw error;
  }
}

// ============================================================================
// CALIFICACIONES
// ============================================================================

export async function getCalificacionesByAlumno(
  alumnoId: string,
  anioLectivo: number
): Promise<(CalificacionFirestore & { id: string })[]> {
  try {
    const q = query(
      collection(db, 'calificaciones'),
      where('alumnoRef', '==', doc(db, 'alumnos', alumnoId)),
      where('anioLectivo', '==', anioLectivo)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Array<CalificacionFirestore & { id: string }>;
  } catch (error) {
    console.error('Error fetching calificaciones by alumno:', error);
    throw error;
  }
}

export async function getCalificacionesByCurso(
  cursoId: string,
  anioLectivo: number
): Promise<(CalificacionFirestore & { id: string })[]> {
  try {
    const q = query(
      collection(db, 'calificaciones'),
      where('cursoRef', '==', doc(db, 'cursos', cursoId)),
      where('anioLectivo', '==', anioLectivo)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Array<CalificacionFirestore & { id: string }>;
  } catch (error) {
    console.error('Error fetching calificaciones by curso:', error);
    throw error;
  }
}

export async function getCalificacionesByAsignacion(
  asignacionId: string,
  anioLectivo: number
): Promise<(CalificacionFirestore & { id: string })[]> {
  try {
    const q = query(
      collection(db, 'calificaciones'),
      where('asignacionRef', '==', doc(db, 'asignaciones', asignacionId)),
      where('anioLectivo', '==', anioLectivo)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Array<CalificacionFirestore & { id: string }>;
  } catch (error) {
    console.error('Error fetching calificaciones by asignacion:', error);
    throw error;
  }
}

export async function upsertCalificacion(
  data: CalificacionFirestore & { id?: string },
  cicloEstado: 'activo' | 'cerrado'
): Promise<string> {
  try {
    if (cicloEstado === 'cerrado' && !data.previaActiva) {
      throw new Error(
        'El ciclo lectivo está cerrado. No se pueden cargar calificaciones.'
      );
    }

    const isNew = !data.id;
    const calificacionId = data.id || doc(collection(db, 'calificaciones')).id;
    const docRef = doc(db, 'calificaciones', calificacionId);

    const { id: _id, createdAt: _createdAt, ...rest } = data;

    await setDoc(
      docRef,
      {
        ...rest,
        updatedAt: Timestamp.now(),
        ...(isNew ? { createdAt: Timestamp.now() } : {}),
      },
      { merge: true }
    );

    return calificacionId;
  } catch (error) {
    console.error('Error upserting calificacion:', error);
    throw error;
  }
}

// ============================================================================
// INASISTENCIAS
// ============================================================================

export async function getInasistenciasByAlumno(
  alumnoId: string,
  anioLectivo: number
): Promise<(InasistenciaFirestore & { id: string })[]> {
  try {
    const q = query(
      collection(db, 'inasistencias'),
      where('alumnoRef', '==', doc(db, 'alumnos', alumnoId)),
      where('anioLectivo', '==', anioLectivo)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Array<InasistenciaFirestore & { id: string }>;
  } catch (error) {
    console.error('Error fetching inasistencias by alumno:', error);
    throw error;
  }
}

export async function getInasistenciasByCurso(
  cursoId: string,
  anioLectivo: number
): Promise<(InasistenciaFirestore & { id: string })[]> {
  try {
    const q = query(
      collection(db, 'inasistencias'),
      where('cursoRef', '==', doc(db, 'cursos', cursoId)),
      where('anioLectivo', '==', anioLectivo)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Array<InasistenciaFirestore & { id: string }>;
  } catch (error) {
    console.error('Error fetching inasistencias by curso:', error);
    throw error;
  }
}

export async function upsertInasistencia(
  data: InasistenciaFirestore & { id?: string }
): Promise<string> {
  try {
    const inasistenciaId = data.id || doc(collection(db, 'inasistencias')).id;
    const docRef = doc(db, 'inasistencias', inasistenciaId);
    const { id: _id, ...rest } = data;

    await setDoc(
      docRef,
      {
        ...rest,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );

    return inasistenciaId;
  } catch (error) {
    console.error('Error upserting inasistencia:', error);
    throw error;
  }
}

// ============================================================================
// SANCIONES
// ============================================================================

export async function getSancionesByAlumno(
  alumnoId: string,
  anioLectivo: number
): Promise<(SancionFirestore & { id: string })[]> {
  try {
    const q = query(
      collection(db, 'sanciones'),
      where('alumnoRef', '==', doc(db, 'alumnos', alumnoId)),
      where('anioLectivo', '==', anioLectivo),
      where('activo', '==', true)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Array<SancionFirestore & { id: string }>;
  } catch (error) {
    console.error('Error fetching sanciones by alumno:', error);
    throw error;
  }
}

export async function addSancion(
  data: Omit<SancionFirestore, 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const sancionRef = doc(collection(db, 'sanciones'));
    await setDoc(sancionRef, {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return sancionRef.id;
  } catch (error) {
    console.error('Error adding sancion:', error);
    throw error;
  }
}

export async function updateSancion(
  sancionId: string,
  data: Partial<SancionFirestore>
): Promise<void> {
  try {
    const docRef = doc(db, 'sanciones', sancionId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating sancion:', error);
    throw error;
  }
}

// ============================================================================
// USUARIOS
// ============================================================================

export async function getUserById(uid: string): Promise<(UserFirestore & { id: string }) | null> {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as UserFirestore & { id: string };
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

export async function getAllUsers(): Promise<(UserFirestore & { id: string })[]> {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Array<UserFirestore & { id: string }>;
  } catch (error) {
    console.error('Error fetching all users:', error);
    throw error;
  }
}

export async function addUser(
  uid: string,
  data: Omit<UserFirestore, 'createdAt' | 'updatedAt'>
): Promise<void> {
  try {
    const docRef = doc(db, 'users', uid);
    await setDoc(docRef, {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error adding user:', error);
    throw error;
  }
}

export async function updateUser(
  uid: string,
  data: Partial<UserFirestore>
): Promise<void> {
  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

export async function getConfigInstitucional(): Promise<ConfigInstitucional | null> {
  try {
    const docRef = doc(db, 'config', 'institucional');
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return docSnap.data() as ConfigInstitucional;
  } catch (error) {
    console.error('Error fetching config institucional:', error);
    throw error;
  }
}

export async function updateConfigInstitucional(
  data: Partial<ConfigInstitucional>
): Promise<void> {
  try {
    const docRef = doc(db, 'config', 'institucional');
    await setDoc(docRef, { ...data, updatedAt: Timestamp.now() }, { merge: true });
  } catch (error) {
    console.error('Error updating config institucional:', error);
    throw error;
  }
}