import { useMemo } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  AppShell,
  Avatar,
  Badge,
  Box,
  Burger,
  Divider,
  Group,
  Menu,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconCalendar,
  IconCertificate,
  IconChevronDown,
  IconClipboardList,
  IconEye,
  IconFileAnalytics,
  IconHome,
  IconLogout,
  IconNotebook,
  IconReportAnalytics,
  IconUserCircle,
  IconUsersGroup,
} from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '../services/firebase/auth';
import type { UserRole } from '../types/roles';

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador/a',
  profesor: 'Profesor/a',
  coordinador: 'Coordinador/a',
  jefe_coordinacion: 'Jefe/a de Coordinación',
  regente: 'Regente',
  secretaria: 'Secretaria/o',
  directivo: 'Directivo/a',
  auditor: 'Auditor/a externo',
};

interface SidebarItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number; stroke?: number }>;
  roles: UserRole[];
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    label: 'Inicio',
    path: '/dashboard',
    icon: IconHome,
    roles: ['admin', 'profesor', 'coordinador', 'jefe_coordinacion', 'regente', 'secretaria', 'directivo', 'auditor'],
  },
  {
    label: 'Gestión del Ciclo',
    path: '/dashboard/ciclo',
    icon: IconCalendar,
    roles: ['admin', 'auditor'],
  },
  {
    label: 'Listados',
    path: '/dashboard/listados',
    icon: IconUsersGroup,
    roles: ['admin', 'auditor'],
  },
  {
    label: 'Carga de Notas',
    path: '/dashboard/notas',
    icon: IconNotebook,
    roles: ['admin', 'profesor', 'jefe_coordinacion', 'regente', 'secretaria', 'directivo', 'auditor'],
  },
  {
    label: 'Inasistencias',
    path: '/dashboard/inasistencias',
    icon: IconClipboardList,
    roles: ['admin', 'coordinador', 'jefe_coordinacion', 'regente', 'secretaria', 'directivo', 'auditor'],
  },
  {
    label: 'Sanciones',
    path: '/dashboard/sanciones',
    icon: IconFileAnalytics,
    roles: ['admin', 'jefe_coordinacion', 'regente', 'secretaria', 'directivo', 'auditor'],
  },
  {
    label: 'Boletines',
    path: '/dashboard/boletines',
    icon: IconReportAnalytics,
    roles: ['admin', 'coordinador', 'jefe_coordinacion', 'regente', 'secretaria', 'directivo', 'auditor'],
  },
  {
    label: 'Calificadores',
    path: '/dashboard/calificadores',
    icon: IconReportAnalytics,
    roles: ['admin', 'coordinador', 'jefe_coordinacion', 'regente', 'secretaria', 'directivo', 'auditor'],
  },
  {
    label: 'Certificados',
    path: '/dashboard/certificados',
    icon: IconCertificate,
    roles: ['admin', 'jefe_coordinacion', 'regente', 'secretaria', 'directivo', 'auditor'],
  },
];

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  const source = (name ?? email ?? '?').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function DashboardLayout() {
  const { user, userData, cicloLectivoActivo, isReadOnly } = useAuth();
  const navigate = useNavigate();
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure();

  const activeItems = useMemo(() => {
    if (!userData) return [];
    return SIDEBAR_ITEMS.filter((item) => item.roles.includes(userData.role));
  }, [userData]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const displayName = user?.displayName ?? userData?.email ?? 'Usuario';
  const initials = getInitials(displayName, user?.email);

  return (
    <AppShell
      padding="md"
      navbar={{
        width: 268,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened },
      }}
      header={{ height: 64 }}
    >
      <AppShell.Header
        className="no-print"
        style={{
          background: 'white',
          borderBottom: '1px solid var(--mantine-color-gray-2)',
          padding: '0 20px',
        }}
      >
        <Group justify="space-between" align="center" h="100%" wrap="nowrap">
          <Group gap="sm">
            <Burger
              opened={mobileOpened}
              onClick={toggleMobile}
              hiddenFrom="sm"
              size="sm"
            />
            <Box hiddenFrom="sm">
              <Text fw={700} size="sm">
                Boletines Cereijo
              </Text>
            </Box>
          </Group>

          <Group gap="md" wrap="nowrap">
            {cicloLectivoActivo && (
              <Tooltip
                label={`Período habilitado: ${cicloLectivoActivo.periodoHabilitado}`}
              >
                <Badge
                  variant="light"
                  color={cicloLectivoActivo.estado === 'activo' ? 'teal' : 'gray'}
                  size="lg"
                  visibleFrom="sm"
                >
                  Ciclo {cicloLectivoActivo.anio}
                </Badge>
              </Tooltip>
            )}
            {isReadOnly && (
              <Badge
                color="orange"
                variant="light"
                leftSection={<IconEye size={12} />}
                size="lg"
              >
                Solo lectura
              </Badge>
            )}

            <Menu width={240} position="bottom-end" shadow="md">
              <Menu.Target>
                <UnstyledButton
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '4px 8px',
                    borderRadius: 8,
                  }}
                >
                  <Avatar color="brand" radius="xl" size="sm">
                    {initials}
                  </Avatar>
                  <Box visibleFrom="sm">
                    <Text size="sm" fw={600} lh={1.1}>
                      {displayName}
                    </Text>
                    <Text size="xs" c="dimmed" lh={1.1}>
                      {userData ? roleLabels[userData.role] : '...'}
                    </Text>
                  </Box>
                  <IconChevronDown size={14} />
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Sesión</Menu.Label>
                <Menu.Item leftSection={<IconUserCircle size={16} />}>
                  <Text size="sm">{user?.email}</Text>
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconLogout size={16} />}
                  onClick={handleLogout}
                >
                  Cerrar sesión
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        className="no-print"
        p="sm"
        style={{
          background: '#0f172a',
          color: 'white',
          borderRight: 'none',
        }}
      >
        <Group gap="sm" px="xs" py="sm">
          <Box
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.1)',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
              color: 'white',
            }}
          >
            BC
          </Box>
          <Box>
            <Text fw={700} size="sm" c="white" lh={1.1}>
              Boletines Cereijo
            </Text>
            <Text size="xs" c="gray.5" lh={1.1}>
              UBA Escobar
            </Text>
          </Box>
        </Group>

        <Divider color="dark.6" my="xs" />

        <AppShell.Section grow component={ScrollArea} type="auto">
          <Stack gap={2} px={4}>
            {activeItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/dashboard'}
                  onClick={closeMobile}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: 8,
                    textDecoration: 'none',
                    color: isActive ? '#0f172a' : 'rgba(255,255,255,0.85)',
                    backgroundColor: isActive ? 'white' : 'transparent',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: 14,
                    transition: 'background 120ms, color 120ms',
                  })}
                >
                  <Icon size={18} stroke={1.8} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </Stack>
        </AppShell.Section>

        <Divider color="dark.6" my="xs" />

        <Group justify="space-between" px="xs" py={4}>
          <Box>
            <Text size="xs" c="gray.5">
              Conectado como
            </Text>
            <Text size="xs" c="white" truncate maw={180}>
              {user?.email}
            </Text>
          </Box>
          <Tooltip label="Cerrar sesión">
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={handleLogout}
              size="lg"
            >
              <IconLogout size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </AppShell.Navbar>

      <AppShell.Main
        style={{
          background: '#f6f7f9',
          minHeight: '100vh',
        }}
      >
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
