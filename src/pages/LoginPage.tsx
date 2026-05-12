import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Paper,
  Stack,
  Text,
  Title,
  Center,
  Alert,
  Box,
} from '@mantine/core';
import { signInWithGoogle, handleGoogleRedirect } from '../services/firebase/auth';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, loading, error } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Handle the redirect result when returning from Google OAuth
  useEffect(() => {
    handleGoogleRedirect().then(({ error }) => {
      if (error) setLocalError(error);
    });
  }, []);

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, user, navigate]);

  const handleSignIn = async () => {
    setLocalError(null);
    setIsSigningIn(true);
    await signInWithGoogle();
    // Page will redirect to Google; execution stops here.
  };

  return (
    <Center style={{ minHeight: '100vh', padding: 24 }}>
      <Paper radius="md" p="xl" shadow="xl" withBorder style={{ width: '100%', maxWidth: 480 }}>
        <Stack gap="xl" align="center">
          <Box
            style={{
              width: 100,
              height: 100,
              borderRadius: 8,
              backgroundColor: '#f1f3f5',
              display: 'grid',
              placeItems: 'center',
              fontSize: 32,
            }}
          >
            📘
          </Box>

          <Stack gap={4} align="center">
            <Title order={2}>Boletines Cereijo</Title>
            <Text c="dimmed" size="sm" ta="center">
              Colegio Preuniversitario Dr. Ramón A. Cereijo - UBA Escobar
            </Text>
          </Stack>

          <Button fullWidth size="md" onClick={handleSignIn} loading={isSigningIn || loading}>
            Ingresar con cuenta institucional
          </Button>

         {(localError || error) && (
  <Stack gap={4}>
    <Alert color="red" title="Error" variant="outline">
      {localError || error}
    </Alert>
    <Text size="sm" ta="center" c="dimmed">
      Contactá a la administradora:{' '}
      <a href="mailto:friaspaulina@colegioubaescobar.gob.ar">
        friaspaulina@colegioubaescobar.gob.ar
      </a>
    </Text>
  </Stack>
)}
        </Stack>
      </Paper>
    </Center>
  );
}
