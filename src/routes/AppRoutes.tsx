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

// ============================================================================
// ROUTER DEFINITION
// ============================================================================

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
      <PrivateRoute
        allowedRoles={[
          'admin',
          'profesor',
          'coordinador',
          'jefe_coordinacion',
          'regente',
          'secretaria',
          'directivo',
        ]}
      >
        <DashboardLayout />
      </PrivateRoute>
    ),
    children: [
      {
        path: 'ciclo',
        element: (
          <PrivateRoute allowedRoles={['admin']}>
            <CicloLectivoPage />
          </PrivateRoute>
        ),
      },
      {
        path: 'listados',
        element: (
          <PrivateRoute allowedRoles={['admin']}>
            <ListadosPage />
          </PrivateRoute>
        ),
      },
      {
        path: 'notas',
        element: (
          <PrivateRoute
            allowedRoles={[
              'admin',
              'profesor',
              'jefe_coordinacion',
              'regente',
              'secretaria',
              'directivo',
            ]}
          >
            <CargaNotasPage />
          </PrivateRoute>
        ),
      },
      {
        path: 'inasistencias',
        element: (
          <PrivateRoute
            allowedRoles={[
              'admin',
              'coordinador',
              'jefe_coordinacion',
              'regente',
              'secretaria',
              'directivo',
            ]}
          >
            <InasistenciasPage />
          </PrivateRoute>
        ),
      },
      {
        path: 'sanciones',
        element: (
          <PrivateRoute
            allowedRoles={[
              'admin',
              'jefe_coordinacion',
              'regente',
              'secretaria',
              'directivo',
            ]}
          >
            <SancionesPage />
          </PrivateRoute>
        ),
      },
      {
        path: 'boletines',
        element: (
          <PrivateRoute
            allowedRoles={[
              'admin',
              'coordinador',
              'jefe_coordinacion',
              'regente',
              'secretaria',
              'directivo',
            ]}
          >
            <BoletinesPage />
          </PrivateRoute>
        ),
      },
      {
        path: 'calificadores',
        element: (
          <PrivateRoute
            allowedRoles={[
              'admin',
              'coordinador',
              'jefe_coordinacion',
              'regente',
              'secretaria',
              'directivo',
            ]}
          >
            <CalificadoresPage />
          </PrivateRoute>
        ),
      },
      {
        path: 'certificados',
        element: (
          <PrivateRoute
            allowedRoles={[
              'admin',
              'jefe_coordinacion',
              'regente',
              'secretaria',
              'directivo',
            ]}
          >
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

// ============================================================================
// COMPONENT
// ============================================================================

export default function AppRoutes() {
  return <RouterProvider router={router} />;
}
