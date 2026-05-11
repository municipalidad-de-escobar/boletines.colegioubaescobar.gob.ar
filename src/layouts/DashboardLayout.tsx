import { useMemo } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AppShell, Group, Stack, Text, Button, Box, ScrollArea } from '@mantine/core';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '../services/firebase/auth';
import type { UserRole } from '../types/roles';

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  profesor: 'Profesor/a',
  coordinador: 'Coordinador/a',
  jefe_coordinacion: 'Jefe/a de Coordinación',
  regente: 'Regente',
  secretaria: 'Secretaria',
  directivo: 'Directivo/a',
};

const sidebarItems = [
  { label: 'Inicio', path: '/dashboard', icon: '🏠', roles: ['admin', 'profesor', 'coordinador', 'jefe_coordinacion', 'regente', 'secretaria', 'directivo'] as UserRole[] },
  { label: 'Gestión del Ciclo', path: '/dashboard/ciclo', icon: '📅', roles: ['admin'] as UserRole[] },
  { label: 'Listados', path: '/dashboard/listados', icon: '📋', roles: ['admin'] as UserRole[] },
  { label: 'Carga de Notas', path: '/dashboard/notas', icon: '📝', roles: ['admin', 'profesor', 'jefe_coordinacion', 'regente', 'secretaria', 'directivo'] as UserRole[] },
  { label: 'Inasistencias', path: '/dashboard/inasistencias', icon: '📌', roles: ['admin', 'coordinador', 'jefe_coordinacion', 'regente', 'secretaria', 'directivo'] as UserRole[] },
  { label: 'Sanciones', path: '/dashboard/sanciones', icon: '⚠️', roles: ['admin', 'jefe_coordinacion', 'regente', 'secretaria', 'directivo'] as UserRole[] },
  { label: 'Boletines', path: '/dashboard/boletines', icon: '📄', roles: ['admin', 'coordinador', 'jefe_coordinacion', 'regente', 'secretaria', 'directivo'] as UserRole[] },
  { label: 'Calificadores', path: '/dashboard/calificadores', icon: '📊', roles: ['admin', 'coordinador', 'jefe_coordinacion', 'regente', 'secretaria', 'directivo'] as UserRole[] },
  { label: 'Certificados', path: '/dashboard/certificados', icon: '🎓', roles: ['admin', 'jefe_coordinacion', 'regente', 'secretaria', 'directivo'] as UserRole[] },
  { label: 'Historial de Sanciones', path: '/dashboard/reportes-sanciones', icon: '📋', roles: ['admin', 'jefe_coordinacion', 'regente', 'secretaria', 'directivo'] as UserRole[] },
];

export default function DashboardLayout() {
  const { user, userData } = useAuth();
  const navigate = useNavigate();

  const activeItems = useMemo(() => {
    if (!userData) {
      return [];
    }

    return sidebarItems.filter((item) => item.roles.includes(userData.role));
  }, [userData]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <AppShell
      padding="md"
      navbar={{ width: 260, breakpoint: 'sm' }}
      header={{ height: 72 }}
    >
      <AppShell.Navbar 
        p="xs"
        style={{ backgroundColor: '#1c2333', color: 'white' }}
      >
        <Text size="lg" fw={700} c="white" p="xs" mb="xs">
          Boletines Cereijo
        </Text>

        <AppShell.Section grow component={ScrollArea}>
          <Stack gap={4}>
            {activeItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  color: isActive ? '#000' : '#fff',
                  backgroundColor: isActive ? '#ffffff' : 'transparent',
                })}
              >
                <Text size="lg">{item.icon}</Text>
                <Text size="sm" fw={500}>
                  {item.label}
                </Text>
              </NavLink>
            ))}
          </Stack>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Header style={{ backgroundColor: 'white', borderBottom: '1px solid #e9ecef', padding: '0 24px' }}>
        <Group justify="space-between" align="center" style={{ height: 72 }}>
          <Box>
            <Text size="sm" c="dimmed">
              Bienvenido/a
            </Text>
            <Text size="lg" fw={700}>
              {user?.displayName ?? userData?.email ?? 'Usuario'}
            </Text>
            <Text size="sm" c="dimmed">
              {userData ? roleLabels[userData.role] : 'Cargando rol...'}
            </Text>
          </Box>
          <Button variant="outline" color="dark" onClick={handleLogout}>
            Cerrar sesión
          </Button>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Box p="md">
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
