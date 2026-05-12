import { Button, Center, Group, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft, IconLock } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AccessDeniedPage() {
  const navigate = useNavigate();
  const { userData } = useAuth();

  return (
    <Center mih="60vh" px="md">
      <Stack align="center" gap="md" maw={460}>
        <Group
          justify="center"
          align="center"
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'var(--mantine-color-red-0)',
          }}
        >
          <IconLock size={36} color="var(--mantine-color-red-6)" />
        </Group>
        <Title order={2} ta="center">
          Acceso denegado
        </Title>
        <Text c="dimmed" ta="center">
          {userData
            ? `Tu rol (${userData.role}) no tiene permisos para ver esta sección.`
            : 'No tenés permisos para acceder a esta sección.'}
        </Text>
        <Button
          leftSection={<IconArrowLeft size={16} />}
          variant="light"
          onClick={() => navigate('/dashboard')}
        >
          Volver al panel
        </Button>
      </Stack>
    </Center>
  );
}
