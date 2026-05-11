import { useState, useEffect } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Modal,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useAuth } from '../contexts/AuthContext';
import {
  getCicloLectivoActivo,
  updateCicloLectivo,
  cerrarCicloLectivo,
  getConfigInstitucional,
  updateConfigInstitucional,
} from '../services/firebase/firestore';
import type { CicloLectivoFirestore } from '../types/firestore';

// ============================================================================
// TIPOS Y CONSTANTES
// ============================================================================

type Periodo = CicloLectivoFirestore['periodoHabilitado'];

const PERIODO_LABELS: Record<Periodo, string> = {
  t1: '1° Trimestre',
  t2: '2° Trimestre',
  t3: '3° Trimestre',
  diciembre: 'Diciembre',
  febrero: 'Febrero',
  adicional: 'Adicional',
  cerrado: 'Cerrado',
};

const PERIODO_FLOW: Periodo[] = [
  't1', 't2', 't3', 'diciembre', 'febrero', 'adicional', 'cerrado',
];

function getSiguientePeriodo(actual: Periodo): Periodo | null {
  const idx = PERIODO_FLOW.indexOf(actual);
  if (idx === -1 || idx === PERIODO_FLOW.length - 1) return null;
  return PERIODO_FLOW[idx + 1];
}

// ============================================================================
// COMPONENTE
// ============================================================================

export default function CicloLectivoPage() {
  const { user } = useAuth();

  const [ciclo, setCiclo] = useState<CicloLectivoFirestore | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [confirmModal, setConfirmModal] = useState(false);
  const [targetPeriodo, setTargetPeriodo] = useState<Periodo | null>(null);

  const [firma1Nombre, setFirma1Nombre] = useState('');
  const [firma1Cargo, setFirma1Cargo] = useState('');
  const [firma2Nombre, setFirma2Nombre] = useState('');
  const [firma2Cargo, setFirma2Cargo] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  const showMessage = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [cicloData, configData] = await Promise.all([
          getCicloLectivoActivo(),
          getConfigInstitucional(),
        ]);
        setCiclo(cicloData);
        if (configData) {
          setFirma1Nombre(configData.firma1Nombre ?? '');
          setFirma1Cargo(configData.firma1Cargo ?? '');
          setFirma2Nombre(configData.firma2Nombre ?? '');
          setFirma2Cargo(configData.firma2Cargo ?? '');
        }
      } catch {
        showMessage('Error al cargar datos del ciclo lectivo', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAvanzarPeriodo = () => {
    if (!ciclo) return;
    const siguiente = getSiguientePeriodo(ciclo.periodoHabilitado);
    if (!siguiente) return;
    setTargetPeriodo(siguiente);
    setConfirmModal(true);
  };

  const handleConfirmarAvance = async () => {
    if (!ciclo || !targetPeriodo || !user) return;
    setSaving(true);
    setConfirmModal(false);
    try {
      if (targetPeriodo === 'cerrado') {
        await cerrarCicloLectivo(ciclo.anio, user.uid);
        setCiclo({ ...ciclo, periodoHabilitado: 'cerrado', estado: 'cerrado' });
      } else {
        await updateCicloLectivo(ciclo.anio, { periodoHabilitado: targetPeriodo });
        setCiclo({ ...ciclo, periodoHabilitado: targetPeriodo });
      }
      showMessage(`Período actualizado a "${PERIODO_LABELS[targetPeriodo]}"`);
    } catch {
      showMessage('Error al actualizar el período', 'error');
    } finally {
      setSaving(false);
      setTargetPeriodo(null);
    }
  };

  const handleGuardarConfig = async () => {
    setSavingConfig(true);
    try {
      await updateConfigInstitucional({ firma1Nombre, firma1Cargo, firma2Nombre, firma2Cargo });
      showMessage('Configuración de firmas guardada');
    } catch {
      showMessage('Error al guardar la configuración', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  if (loading) {
    return <Center py="xl"><Loader /></Center>;
  }

  if (!ciclo) {
    return (
      <Alert color="orange" title="Sin ciclo activo">
        No hay ningún ciclo lectivo activo en el sistema.
      </Alert>
    );
  }

  const siguientePeriodo = getSiguientePeriodo(ciclo.periodoHabilitado);
  const esCerrado = ciclo.periodoHabilitado === 'cerrado';
  const idxActual = PERIODO_FLOW.indexOf(ciclo.periodoHabilitado);

  return (
    <Box>
      <Title order={2} mb="md">Gestión del Ciclo Lectivo</Title>

      {message && (
        <Alert color={message.type === 'error' ? 'red' : 'green'} mb="md">
          {message.text}
        </Alert>
      )}

      {/* ================================================================
          ESTADO ACTUAL
      ================================================================ */}
      <Paper withBorder p="lg" mb="md">
        <Title order={4} mb="sm">Estado actual</Title>
        <Stack gap="xs">
          <Group>
            <Text fw={600} w={180}>Año lectivo:</Text>
            <Text>{ciclo.anio}</Text>
          </Group>
          <Group>
            <Text fw={600} w={180}>Período habilitado:</Text>
            <Badge color={esCerrado ? 'gray' : 'blue'} size="lg">
              {PERIODO_LABELS[ciclo.periodoHabilitado]}
            </Badge>
          </Group>
          <Group>
            <Text fw={600} w={180}>Estado del ciclo:</Text>
            <Badge color={ciclo.estado === 'activo' ? 'green' : 'gray'} size="lg">
              {ciclo.estado === 'activo' ? 'Activo' : 'Cerrado'}
            </Badge>
          </Group>
        </Stack>
      </Paper>

      {/* ================================================================
          CAMBIO DE PERÍODO
      ================================================================ */}
      <Paper withBorder p="lg" mb="md">
        <Title order={4} mb="md">Cambio de período</Title>

        <Group gap={4} mb="lg" wrap="wrap" align="center">
          {PERIODO_FLOW.map((p, idx) => {
            const isActual = p === ciclo.periodoHabilitado;
            const isPasado = idx < idxActual;
            return (
              <Group key={p} gap={4} align="center">
                <Badge
                  size="md"
                  color={isActual ? 'blue' : 'gray'}
                  variant={isActual ? 'filled' : isPasado ? 'outline' : 'light'}
                >
                  {PERIODO_LABELS[p]}
                </Badge>
                {idx < PERIODO_FLOW.length - 1 && (
                  <Text c="dimmed" size="sm">→</Text>
                )}
              </Group>
            );
          })}
        </Group>

        {esCerrado ? (
          <Text c="dimmed">El ciclo está cerrado. No se puede avanzar.</Text>
        ) : siguientePeriodo ? (
          <Button
            color={siguientePeriodo === 'cerrado' ? 'red' : 'blue'}
            loading={saving}
            onClick={handleAvanzarPeriodo}
          >
            Avanzar a: {PERIODO_LABELS[siguientePeriodo]}
          </Button>
        ) : null}
      </Paper>

      {/* ================================================================
          CONFIGURACIÓN DE FIRMAS
      ================================================================ */}
      <Paper withBorder p="lg">
        <Title order={4} mb="md">Configuración de firmas</Title>
        <Stack gap="sm">
          <Group grow>
            <TextInput
              label="Firma 1 — Nombre"
              value={firma1Nombre}
              onChange={(e) => setFirma1Nombre(e.currentTarget.value)}
            />
            <TextInput
              label="Firma 1 — Cargo"
              value={firma1Cargo}
              onChange={(e) => setFirma1Cargo(e.currentTarget.value)}
            />
          </Group>
          <Group grow>
            <TextInput
              label="Firma 2 — Nombre"
              value={firma2Nombre}
              onChange={(e) => setFirma2Nombre(e.currentTarget.value)}
            />
            <TextInput
              label="Firma 2 — Cargo"
              value={firma2Cargo}
              onChange={(e) => setFirma2Cargo(e.currentTarget.value)}
            />
          </Group>
          <Group justify="flex-end" mt="xs">
            <Button onClick={handleGuardarConfig} loading={savingConfig}>
              Guardar firmas
            </Button>
          </Group>
        </Stack>
      </Paper>

      {/* ================================================================
          MODAL DE CONFIRMACIÓN
      ================================================================ */}
      <Modal
        opened={confirmModal}
        onClose={() => setConfirmModal(false)}
        title="Confirmar cambio de período"
        centered
      >
        <Stack gap="md">
          {targetPeriodo === 'cerrado' ? (
            <Alert color="red" title="Acción irreversible">
              Vas a <strong>cerrar definitivamente</strong> el ciclo lectivo{' '}
              {ciclo.anio}. Una vez cerrado no se podrán cargar ni modificar
              calificaciones. Esta acción no se puede deshacer.
            </Alert>
          ) : (
            <Text>
              ¿Confirmás avanzar de{' '}
              <strong>{PERIODO_LABELS[ciclo.periodoHabilitado]}</strong> a{' '}
              <strong>{targetPeriodo ? PERIODO_LABELS[targetPeriodo] : ''}</strong>?
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="outline" onClick={() => setConfirmModal(false)}>
              Cancelar
            </Button>
            <Button
              color={targetPeriodo === 'cerrado' ? 'red' : 'blue'}
              onClick={handleConfirmarAvance}
            >
              Confirmar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
