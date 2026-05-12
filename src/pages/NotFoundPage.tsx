import { Button, Center, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Center mih="100vh" px="md" style={{ background: '#f6f7f9' }}>
      <Stack align="center" gap="md" maw={420}>
        <Text size="80px" fw={700} c="brand" lh={1}>
          404
        </Text>
        <Title order={2} ta="center">
          Página no encontrada
        </Title>
        <Text c="dimmed" ta="center">
          La página que buscás no existe o fue movida. Verificá la dirección o
          volvé al inicio.
        </Text>
        <Button
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate('/')}
          mt="sm"
        >
          Volver al inicio
        </Button>
      </Stack>
    </Center>
  );
}
