import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Anchor,
  Box,
  Button,
  Card,
  Center,
  Container,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconArrowRight,
  IconBookmarks,
  IconExternalLink,
  IconSchool,
} from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext';

export default function InicioPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <Center mih="100vh">
        <Loader />
      </Center>
    );
  }

  const goToBoletines = () => {
    navigate(user ? '/dashboard' : '/login');
  };

  return (
    <Box style={{ minHeight: '100vh', background: '#f6f7f9' }}>
      <Box
        component="header"
        py="md"
        px="lg"
        style={{
          background: 'white',
          borderBottom: '1px solid var(--mantine-color-gray-2)',
        }}
      >
        <Container size="lg" px={0}>
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <img
                src="/logos/logo-blanco.png"
                alt="Cereijo"
                style={{ height: 36 }}
              />
              <Box>
                <Text fw={700} size="sm" lh={1.1}>
                  Colegio Cereijo
                </Text>
                <Text size="xs" c="dimmed" lh={1.1}>
                  UBA Escobar
                </Text>
              </Box>
            </Group>
            <Button
              variant="subtle"
              rightSection={<IconArrowRight size={14} />}
              onClick={() => navigate('/login')}
            >
              Iniciar sesión
            </Button>
          </Group>
        </Container>
      </Box>

      <Container size="lg" py="xl">
        <Stack align="center" gap="xs" mb="xl" mt="md">
          <Group gap="md" justify="center" wrap="wrap">
            <img
              src="/logos/logo-blanco.png"
              alt="Colegio"
              style={{ height: 72, objectFit: 'contain' }}
            />
            <img
              src="/logos/logo-muni.png"
              alt="Municipalidad"
              style={{ height: 72, objectFit: 'contain' }}
            />
            <img
              src="/logos/logo-uba.png"
              alt="UBA"
              style={{ height: 72, objectFit: 'contain' }}
            />
          </Group>
          <Title order={1} ta="center" mt="sm" style={{ fontSize: 32 }}>
            Colegio Preuniversitario Dr. Ramón A. Cereijo
          </Title>
          <Text c="dimmed" size="lg" ta="center">
            Sistema institucional digital — UBA Escobar
          </Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg" mt="xl">
          <Card withBorder padding="xl" shadow="sm" radius="lg">
            <Stack gap="md">
              <Box
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 12,
                  background: 'var(--mantine-color-brand-0)',
                  color: 'var(--mantine-color-brand-7)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <IconBookmarks size={28} />
              </Box>
              <Box>
                <Title order={3}>Boletines Cereijo</Title>
                <Text c="dimmed" mt="xs">
                  Plataforma para profesores y personal del colegio. Gestioná
                  calificaciones, inasistencias, sanciones y emití boletines
                  oficiales.
                </Text>
              </Box>
              <Button
                size="md"
                rightSection={<IconArrowRight size={16} />}
                onClick={goToBoletines}
                fullWidth
              >
                {user ? 'Ir al panel' : 'Iniciar sesión'}
              </Button>
            </Stack>
          </Card>

          <Card withBorder padding="xl" shadow="sm" radius="lg">
            <Stack gap="md">
              <Box
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 12,
                  background: 'var(--mantine-color-teal-0)',
                  color: 'var(--mantine-color-teal-7)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <IconSchool size={28} />
              </Box>
              <Box>
                <Title order={3}>Curso de Ingreso</Title>
                <Text c="dimmed" mt="xs">
                  Inscripciones, calificaciones del curso de ingreso, listados
                  de mérito y reportes para aspirantes.
                </Text>
              </Box>
              <Button
                size="md"
                variant="outline"
                rightSection={<IconExternalLink size={16} />}
                component="a"
                href="https://app.colegioubaescobar.gob.ar/"
                target="_blank"
                rel="noopener noreferrer"
                fullWidth
              >
                Abrir Curso de Ingreso
              </Button>
            </Stack>
          </Card>
        </SimpleGrid>

        <Text size="sm" c="dimmed" ta="center" mt="xl">
          ¿Necesitás ayuda? Contactá a{' '}
          <Anchor href="mailto:friaspaulina@colegioubaescobar.gob.ar">
            friaspaulina@colegioubaescobar.gob.ar
          </Anchor>
          .
        </Text>
      </Container>
    </Box>
  );
}
