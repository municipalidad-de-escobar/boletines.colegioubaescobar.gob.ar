export type UserRole =
  | 'admin'
  | 'profesor'
  | 'coordinador'
  | 'jefe_coordinacion'
  | 'regente'
  | 'secretaria'
  | 'directivo'
  | 'auditor';

// Roles that can read every page but cannot mutate data.
// Enforced at the UI layer (action buttons hidden) and assumed to be
// mirrored by Firestore Security Rules.
export const READ_ONLY_ROLES: readonly UserRole[] = ['auditor'];

export const isReadOnlyRole = (role: UserRole | null | undefined): boolean =>
  role != null && READ_ONLY_ROLES.includes(role);

export type Permission =
  | 'view_boletines'
  | 'edit_alumnos'
  | 'upload_csv'
  | 'edit_calificaciones_trimestres'
  | 'edit_calificaciones_evaluacion'
  | 'view_calificaciones'
  | 'edit_inasistencias'
  | 'edit_sanciones'
  | 'manage_usuarios'
  | 'close_ciclo';

export type RolePermissionMap = Record<UserRole, Permission[]>;

export interface UserRoleDefinition {
  role: UserRole;
  label: string;
  permissions: Permission[];
}
