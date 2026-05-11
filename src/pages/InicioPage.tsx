import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Center, Stack, Title, Text, Button, Group, Paper } from '@mantine/core';
import { useAuth } from '../contexts/AuthContext';

export default function InicioPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, user, navigate]);

  const handleCourseClick = () => {
    window.open('https://app.colegioubaescobar.gob.ar/', '_blank');
  };

  const handleBoletinesClick = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <Center style={{ minHeight: '100vh', padding: 24 }}>
      <Paper radius="md" p="xl" shadow="xl" style={{ width: '100%', maxWidth: 820 }}>
        <Stack gap="xl" align="center">
          <Group justify="center" gap="xl" wrap="nowrap">
            <img 
  src="/logos/logo-blanco.png" 
  alt="Logo Colegio" 
  style={{ height: 100, objectFit: 'contain' }} 
/>
<img 
  src="/logos/logo-muni.png" 
  alt="Logo Municipalidad" 
  style={{ height: 100, objectFit: 'contain' }} 
/>
<img 
  src="/logos/logo-uba.png" 
  alt="Logo UBA" 
  style={{ height: 100, objectFit: 'contain' }} 
/>
          </Group>

          <Stack align="center" gap={4}>
            <Title order={2} ta="center">
              Colegio Preuniversitario Dr. Ramón A. Cereijo
            </Title>
            <Text c="dimmed" size="lg" ta="center">
              UBA Escobar
            </Text>
          </Stack>

          <Group gap="md" align="stretch" grow>
           <Button size="lg" variant="outline" onClick={handleCourseClick}>
              Curso de Ingreso
            </Button>
            <Button size="lg" onClick={handleBoletinesClick}>
              Boletines Cereijo
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Center>
  );
}
