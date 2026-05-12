import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import DashboardLayout from '../layouts/DashboardLayout';
import InicioPage from '../pages/InicioPage';
import LoginPage from '../pages/LoginPage';
import NotFoundPage from '../pages/NotFoundPage';
import CicloLectivoPage from '../pages/CicloLectivoPage';
import ListadosPage from '../pages/ListadosPage';
import CargaNotasPage from '../pages/CargaNotasPage';
import InasistenciasPage from '../pages/InasistenciasPage';
import SancionesPage from '../pages/SancionesPage';
import BoletinesPage from '../pages/BoletinesPage';
import CalificadoresPage from '../pages/CalificadoresPage';
import CertificadosPage from '../pages/CertificadosPage';
import DashboardHome from '../pages/DashboardHome';
import type { UserRole } from '../types/roles';

// Roles allowed in the dashboard shell. Auditors get the same surface but
// every page enforces read-only behavior through useAuth().isReadOnly.
const ALL_ROLES: UserRole[] = [
  'admin',
  'profesor',
  'coordinador',
  'jefe_coordinacion',
  'regente',
  'secretaria',
  'directivo',
  'auditor',
];

const STAFF_AND_AUDITOR: UserRole[] = [
  'admin',
  'jefe_coordinacion',
  'regente',
  'secretaria',
  'directivo',
  'auditor',
];

const STAFF_COORD_AND_AUDITOR: UserRole[] = [
  'admin',
  'coordinador',
  'jefe_coordinacion',
  'regente',
  'secretaria',
  'directivo',
  'auditor',
];

const NOTAS_ROLES: UserRole[] = [
  'admin',
  'profesor',
  'jefe_coordinacion',
  'regente',
  'secretaria',
  'directivo',
  'auditor',
];

const router = createBrowserRouter([
  {
    path: '/',
    element: <InicioPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/dashboard',
    element: (
      <PrivateRoute allowedRoles={ALL_ROLES}>
        <DashboardLayout />
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardHome />,
      },
      {
        path: 'ciclo',
        element: (
          <PrivateRoute allowedRoles={['admin', 'auditor']}>
            <CicloLectivoPage />
          </PrivateRoute>
        ),
      },
      {
        path: 'listados',
        element: (
          <PrivateRoute allowedRoles={['admin', 'auditor']}>
            <ListadosPage />
          </PrivateRoute>
        ),
      },
      {
        path: 'notas',
        element: (
          <PrivateRoute allowedRoles={NOTAS_ROLES}>
            <CargaNotasPage />
          </PrivateRoute>
        ),
      },
      {
        path: 'inasistencias',
        element: (
          <PrivateRoute allowedRoles={STAFF_COORD_AND_AUDITOR}>
            <InasistenciasPage />
          </PrivateRoute>
        ),
      },
      {
        path: 'sanciones',
        element: (
          <PrivateRoute allowedRoles={STAFF_AND_AUDITOR}>
            <SancionesPage />
          </PrivateRoute>
        ),
      },
      {
        path: 'boletines',
        element: (
          <PrivateRoute allowedRoles={STAFF_COORD_AND_AUDITOR}>
            <BoletinesPage />
          </PrivateRoute>
        ),
      },
      {
        path: 'calificadores',
        element: (
          <PrivateRoute allowedRoles={STAFF_COORD_AND_AUDITOR}>
            <CalificadoresPage />
          </PrivateRoute>
        ),
      },
      {
        path: 'certificados',
        element: (
          <PrivateRoute allowedRoles={STAFF_AND_AUDITOR}>
            <CertificadosPage />
          </PrivateRoute>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export default function AppRoutes() {
  return <RouterProvider router={router} />;
}
