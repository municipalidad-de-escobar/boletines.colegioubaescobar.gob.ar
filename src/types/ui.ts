import type { UserRole } from './roles';

export type PageSection =
  | 'inicio'
  | 'listados'
  | 'carga_notas'
  | 'inasistencias'
  | 'sanciones'
  | 'boletines'
  | 'calificadores'
  | 'certificados';

export type SortDirection = 'asc' | 'desc';

export interface TableSort {
  field: string;
  direction: SortDirection;
}

export interface FilterState {
  cursoId?: string;
  anioLectivo?: number;
  materiaId?: string;
  alumnoId?: string;
  profesorId?: string;
  role?: UserRole;
  trimestre?: 1 | 2 | 3;
  searchText?: string;
}

export interface FormFieldState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  title: string;
  message: string;
  type: ToastType;
  durationMs?: number;
}

export interface UIState {
  activeSection: PageSection;
  isLoading: boolean;
  filters: Partial<Record<PageSection, FilterState>>;
  sorts: Partial<Record<PageSection, TableSort>>;
  toastMessage?: ToastMessage;
  modalOpen: boolean;
}

export interface CSVImportStatus {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: string[];
}
