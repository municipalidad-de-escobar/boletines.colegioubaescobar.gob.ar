import type { DocumentReference, Timestamp } from 'firebase/firestore';
import type {
  Col5State,
  Col6State,
  Col7State,
  Col8State,
  Promocion,
} from './grading';
import type { UserRole } from './roles';

export interface UserFirestore {
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  photoURL?: string;
  phoneNumber?: string;
}

export interface CursoFirestore {
  year: 1 | 2 | 3 | 4 | 5 | 6;
  division: 'A' | 'B' | 'C' | 'D' | 'AB' | 'CD';
  name: string;
  active: boolean;
}

export interface MateriaFirestore {
  name: string;
  orden: number;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AlumnoFirestore {
  firstName: string;
  lastName: string;
  dni: string;
  email?: string;
  fechaNacimiento?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface HistorialCursoFirestore {
  anioLectivo: number;
  cursoRef: DocumentReference<CursoFirestore>;
  estado: 'activo' | 'egresado' | 'retirado';
  updatedAt: Timestamp;
}

export interface AsignacionFirestore {
  profesorRef: DocumentReference<UserFirestore>;
  cursoRef: DocumentReference<CursoFirestore>;
  materiaRef: DocumentReference<MateriaFirestore>;
  anioLectivo: number;
  active: boolean;
  desde: Timestamp;
  hasta?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CalificacionFirestore {
  alumnoRef: DocumentReference<AlumnoFirestore>;
  cursoRef: DocumentReference<CursoFirestore>;
  materiaRef: DocumentReference<MateriaFirestore>;
  asignacionRef?: DocumentReference<AsignacionFirestore>;
  anioLectivo: number;
  col1: number | null;
  col2: number | null;
  col3: number | null;
  col5: Col5State;
  col6: Col6State;
  col7: Col7State;
  col8: Col8State;
  condicion?: 'REGULAR' | 'LIBRE';
  establecimiento?: string;
  previaActiva: boolean;
  fechaRendicionPrevia?: Timestamp;
  promocion: Promocion;
  notaFinalManual?: number | null;
  updatedAt: Timestamp;
  updatedByRef: DocumentReference<UserFirestore>;
  createdAt: Timestamp;
}

export interface InasistenciaFirestore {
  alumnoRef: DocumentReference<AlumnoFirestore>;
  cursoRef: DocumentReference<CursoFirestore>;
  anioLectivo: number;
  trimestre: 1 | 2 | 3;
  cantidad: number;
  justificadas: number;
  noJustificadas: number;
  motivo?: string;
  registeredByRef: DocumentReference<UserFirestore>;
  registeredAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SancionFirestore {
  alumnoRef: DocumentReference<AlumnoFirestore>;
  cursoRef: DocumentReference<CursoFirestore>;
  anioLectivo: number;
  fecha: Timestamp;
  tipo: string;
  descripcion: string;
  cantidad: number;
  duracionDias?: number;
  activo: boolean;
  autorRef: DocumentReference<UserFirestore>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CicloLectivoFirestore {
  anio: number;
  estado: 'activo' | 'cerrado';
  fechaInicio: Timestamp;
  fechaCierre?: Timestamp;
  cerradoPor?: DocumentReference<UserFirestore>;
  trimestresHabilitados: {
    t1: boolean;
    t2: boolean;
    t3: boolean;
  };
  periodoHabilitado:
    | 't1'
    | 't2'
    | 't3'
    | 'diciembre'
    | 'febrero'
    | 'adicional'
    | 'cerrado';
  updatedAt: Timestamp;
  updatedByRef: DocumentReference<UserFirestore>;
}

export interface ConfigInstitucional {
  firma1Nombre: string;
  firma1Cargo: string;
  firma2Nombre: string;
  firma2Cargo: string;
}
