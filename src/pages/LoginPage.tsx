import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Anchor,
  Box,
  Button,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconBrandGoogle, IconShieldLock } from '@tabler/icons-react';
import { signInWithGoogle, handleGoogleRedirect } from '../services/firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { INSTITUTIONAL_DOMAIN } from '../config/auditors';

const SUPPORT_EMAIL = 'friaspaulina@colegioubaescobar.gob.ar';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, loading, error } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    handleGoogleRedirect()
      .then(({ error: redirectError }) => {
        if (redirectError) setLocalError(redirectError);
      })
      .finally(() => setIsSigningIn(false));
  }, []);

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, user, navigate]);

  const handleSignIn = async () => {
    setLocalError(null);
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
      // signInWithRedirect navigates away; control returns only on failure.
    } catch (err) {
      setIsSigningIn(false);
      setLocalError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    }
  };

  const visibleError = localError ?? error;

  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
      }}
    >
      <Box
        visibleFrom="md"
        style={{
          background:
            'linear-gradient(140deg, #3730a3 0%, #4f46e5 45%, #6366f1 100%)',
          color: 'white',
          padding: '48px 56px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle at 20% 10%, rgba(255,255,255,0.18), transparent 40%), radial-gradient(circle at 80% 90%, rgba(255,255,255,0.12), transparent 35%)',
            pointerEvents: 'none',
          }}
        />
        <Group gap="md" style={{ position: 'relative' }}>
          <img
            src="/logos/logo-blanco.png"
            alt="Colegio Cereijo"
            style={{ height: 56, filter: 'brightness(0) invert(1)' }}
          />
        </Group>

        <Stack gap="md" style={{ position: 'relative' }}>
          <Title order={1} c="white" style={{ fontSize: 40, lineHeight: 1.1 }}>
            Boletines Cereijo
          </Title>
          <Text c="white" opacity={0.85} size="lg" maw={420}>
            Sistema institucional de gestión académica del Colegio
            Preuniversitario Dr. Ramón A. Cereijo — UBA Escobar.
          </Text>
          <Stack gap={6} mt="md">
            <Group gap="xs">
              <IconShieldLock size={18} />
              <Text size="sm" c="white" opacity={0.9}>
                Acceso exclusivo con cuenta institucional
              </Text>
            </Group>
          </Stack>
        </Stack>

        <Text size="xs" c="white" opacity={0.6} style={{ position: 'relative' }}>
          © {new Date().getFullYear()} Colegio UBA Escobar
        </Text>
      </Box>

      <Box
        style={{
          padding: '48px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f6f7f9',
        }}
      >
        <Paper
          radius="lg"
          p="xl"
          shadow="sm"
          withBorder
          style={{ width: '100%', maxWidth: 440 }}
        >
          <Stack gap="lg">
            <Stack gap={4}>
              <Title order={2}>Iniciar sesión</Title>
              <Text c="dimmed" size="sm">
                Ingresá con tu cuenta de Google institucional para continuar.
              </Text>
            </Stack>

            <Button
              size="md"
              fullWidth
              leftSection={<IconBrandGoogle size={18} />}
              onClick={handleSignIn}
              loading={isSigningIn || loading}
            >
              Continuar con Google
            </Button>

            {visibleError && (
              <Alert
                icon={<IconAlertCircle size={18} />}
                color="red"
                variant="light"
                title="No pudimos iniciar tu sesión"
              >
                <Stack gap={4}>
                  <Text size="sm">{visibleError}</Text>
                  <Text size="xs" c="dimmed">
                    ¿Necesitás ayuda? Escribinos a{' '}
                    <Anchor href={`mailto:${SUPPORT_EMAIL}`} size="xs">
                      {SUPPORT_EMAIL}
                    </Anchor>
                    .
                  </Text>
                </Stack>
              </Alert>
            )}

            <Divider label="Información de acceso" labelPosition="center" />

            <Stack gap={6}>
              <Text size="xs" c="dimmed">
                Solo se permite el inicio de sesión con cuentas{' '}
                <Text span fw={600}>@{INSTITUTIONAL_DOMAIN}</Text>.
              </Text>
              <Text size="xs" c="dimmed">
                Si sos auditor/a externo/a, tu cuenta debe estar previamente
                autorizada.
              </Text>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
