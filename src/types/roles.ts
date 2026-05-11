export type UserRole =
  | 'admin'
  | 'profesor'
  | 'coordinador'
  | 'jefe_coordinacion'
  | 'regente'
  | 'secretaria'
  | 'directivo';

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
