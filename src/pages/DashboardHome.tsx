import { Badge, Box, Card, Grid, Group, Stack, Text, Title } from '@mantine/core';
import {
  IconCalendar,
  IconCertificate,
  IconClipboardList,
  IconFileAnalytics,
  IconNotebook,
  IconReportAnalytics,
  IconUsersGroup,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types/roles';

interface Tile {
  title: string;
  description: string;
  path: string;
  icon: React.ComponentType<{ size?: number; stroke?: number }>;
  roles: UserRole[];
  color: string;
}

const TILES: Tile[] = [
  {
    title: 'Carga de Notas',
    description: 'Registrar y revisar calificaciones por curso y materia.',
    path: '/dashboard/notas',
    icon: IconNotebook,
    roles: ['admin', 'profesor', 'jefe_coordinacion', 'regente', 'secretaria', 'directivo', 'auditor'],
    color: 'indigo',
  },
  {
    title: 'Inasistencias',
    description: 'Registro de asistencia trimestral por alumno.',
    path: '/dashboard/inasistencias',
    icon: IconClipboardList,
    roles: ['admin', 'coordinador', 'jefe_coordinacion', 'regente', 'secretaria', 'directivo', 'auditor'],
    color: 'cyan',
  },
  {
    title: 'Sanciones',
    description: 'Historial disciplinario y emisión de constancias.',
    path: '/dashboard/sanciones',
    icon: IconFileAnalytics,
    roles: ['admin', 'jefe_coordinacion', 'regente', 'secretaria', 'directivo', 'auditor'],
    color: 'orange',
  },
  {
    title: 'Boletines',
    description: 'Generación de boletines oficiales por alumno.',
    path: '/dashboard/boletines',
    icon: IconReportAnalytics,
    roles: ['admin', 'coordinador', 'jefe_coordinacion', 'regente', 'secretaria', 'directivo', 'auditor'],
    color: 'teal',
  },
  {
    title: 'Calificadores',
    description: 'Planillas calificadoras por curso.',
    path: '/dashboard/calificadores',
    icon: IconReportAnalytics,
    roles: ['admin', 'coordinador', 'jefe_coordinacion', 'regente', 'secretaria', 'directivo', 'auditor'],
    color: 'grape',
  },
  {
    title: 'Certificados',
    description: 'Emisión de certificados y constancias institucionales.',
    path: '/dashboard/certificados',
    icon: IconCertificate,
    roles: ['admin', 'jefe_coordinacion', 'regente', 'secretaria', 'directivo', 'auditor'],
    color: 'pink',
  },
  {
    title: 'Listados',
    description: 'Alumnos, profesores, cursos, materias y usuarios.',
    path: '/dashboard/listados',
    icon: IconUsersGroup,
    roles: ['admin', 'auditor'],
    color: 'blue',
  },
  {
    title: 'Gestión del Ciclo',
    description: 'Configurar período habilitado y firmas institucionales.',
    path: '/dashboard/ciclo',
    icon: IconCalendar,
    roles: ['admin', 'auditor'],
    color: 'violet',
  },
];

export default function DashboardHome() {
  const { user, userData, cicloLectivoActivo, isAuditor } = useAuth();
  const role = userData?.role;
  const visibleTiles = TILES.filter((t) => (role ? t.roles.includes(role) : false));

  const firstName = userData?.firstName ?? user?.displayName?.split(' ')[0] ?? 'Hola';

  return (
    <Box>
      <Stack gap={4} mb="xl">
        <Group justify="space-between" align="flex-end" wrap="wrap">
          <Box>
            <Text size="sm" c="dimmed">
              Bienvenido/a,
            </Text>
            <Title order={2}>{firstName}</Title>
          </Box>
          <Group gap="xs">
            {cicloLectivoActivo && (
              <Badge size="lg" variant="light" color="brand">
                Ciclo lectivo {cicloLectivoActivo.anio}
              </Badge>
            )}
            {isAuditor && (
              <Badge size="lg" variant="light" color="orange">
                Sesión de auditoría · solo lectura
              </Badge>
            )}
          </Group>
        </Group>
      </Stack>

      <Grid>
        {visibleTiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Grid.Col key={tile.path} span={{ base: 12, sm: 6, lg: 4 }}>
              <Card
                component={Link}
                to={tile.path}
                withBorder
                padding="lg"
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'transform 120ms, box-shadow 120ms',
                  height: '100%',
                }}
                className="dashboard-tile"
              >
                <Stack gap="sm">
                  <Group justify="space-between" align="flex-start">
                    <Box
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 10,
                        display: 'grid',
                        placeItems: 'center',
                        background: `var(--mantine-color-${tile.color}-0)`,
                        color: `var(--mantine-color-${tile.color}-7)`,
                      }}
                    >
                      <Icon size={22} stroke={1.8} />
                    </Box>
                  </Group>
                  <Box>
                    <Text fw={600} size="md">
                      {tile.title}
                    </Text>
                    <Text size="sm" c="dimmed" mt={4}>
                      {tile.description}
                    </Text>
                  </Box>
                </Stack>
              </Card>
            </Grid.Col>
          );
        })}
      </Grid>

      <style>{`
        .dashboard-tile:hover {
          transform: translateY(-2px);
          box-shadow: var(--mantine-shadow-md);
          border-color: var(--mantine-color-brand-4) !important;
        }
      `}</style>
    </Box>
  );
}
