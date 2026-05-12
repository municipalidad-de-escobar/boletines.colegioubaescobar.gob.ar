import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Center,
  Group,
  Loader,
  Select,
  Table,
  Text,
  TextInput,
  Title,
  Alert,
  NumberInput,
} from '@mantine/core';
import { useAuth } from '../contexts/AuthContext';
import {
  getCursos,
  getAlumnosByCurso,
  getInasistenciasByAlumno,
  upsertInasistencia,
} from '../services/firebase/firestore';
import { doc } from 'firebase/firestore';
import { db } from '../services/firebase/firebaseConfig';
import type {
  AlumnoFirestore,
  CursoFirestore,
  InasistenciaFirestore,
} from '../types/firestore';

// ============================================================================
// TYPES
// ============================================================================

interface InasistenciaDisplay {
  alumnoId: string;
  firestoreIdT1?: string;
  firestoreIdT2?: string;
  firestoreIdT3?: string;
  t1_cantidad: number;
  t1_justificadas: number;
  t2_cantidad: number;
  t2_justificadas: number;
  t3_cantidad: number;
  t3_justificadas: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function InasistenciasPage() {
  const { user, userData, cicloLectivoActivo } = useAuth();

  const [cursos, setCursos] = useState<(CursoFirestore & { id: string })[]>([]);
  const [selectedCursoId, setSelectedCursoId] = useState('');
  const [alumnos, setAlumnos] = useState<(AlumnoFirestore & { id: string })[]>([]);
  const [inasistencias, setInasistencias] = useState<InasistenciaDisplay[]>([]);

  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const showMessage = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(null), 5000);
  };

  // ========================================================================
  // LOAD CURSOS
  // ========================================================================

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCursos();
        setCursos(data);
      } catch {
        showMessage('Error al cargar cursos', 'error');
      }
    };
    load();
  }, []);

  // ========================================================================
  // LOAD ALUMNOS E INASISTENCIAS
  // ========================================================================

  useEffect(() => {
    if (!selectedCursoId || !cicloLectivoActivo) return;

    const load = async () => {
      setLoading(true);
      try {
        const alumnosData = await getAlumnosByCurso(selectedCursoId, cicloLectivoActivo.anio);
        setAlumnos(alumnosData);
        setSearchText('');

        const inasistenciasData: InasistenciaDisplay[] = await Promise.all(
          alumnosData.map(async (alumno) => {
            const inas = await getInasistenciasByAlumno(alumno.id, cicloLectivoActivo.anio);

            const t1 = inas.find((i) => i.trimestre === 1);
            const t2 = inas.find((i) => i.trimestre === 2);
            const t3 = inas.find((i) => i.trimestre === 3);

            return {
              alumnoId: alumno.id,
              firestoreIdT1: t1?.id,
              firestoreIdT2: t2?.id,
              firestoreIdT3: t3?.id,
              t1_cantidad: t1?.cantidad ?? 0,
              t1_justificadas: t1?.justificadas ?? 0,
              t2_cantidad: t2?.cantidad ?? 0,
              t2_justificadas: t2?.justificadas ?? 0,
              t3_cantidad: t3?.cantidad ?? 0,
              t3_justificadas: t3?.justificadas ?? 0,
            };
          })
        );

        setInasistencias(inasistenciasData);
      } catch {
        showMessage('Error al cargar inasistencias', 'error');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [selectedCursoId, cicloLectivoActivo]);

  // ========================================================================
  // HANDLE CHANGE
  // ========================================================================

  const handleChange = (
    alumnoId: string,
    field: keyof InasistenciaDisplay,
    value: number
  ) => {
    setInasistencias((prev) =>
      prev.map((ina) =>
        ina.alumnoId === alumnoId ? { ...ina, [field]: value } : ina
      )
    );
  };

  // ========================================================================
  // GUARDAR
  // ========================================================================

  const handleSave = async () => {
    if (!selectedCursoId || !cicloLectivoActivo || !user) {
      showMessage('Seleccione un curso', 'error');
      return;
    }

    setSaving(true);
    let savedCount = 0;

    try {
      for (const ina of inasistencias) {
        for (const trimestre of [1, 2, 3] as const) {
          const cantidad = ina[`t${trimestre}_cantidad`];
          const justificadas = ina[`t${trimestre}_justificadas`];
          const firestoreId = ina[`firestoreIdT${trimestre}` as keyof InasistenciaDisplay] as string | undefined;

          if (cantidad === 0 && justificadas === 0 && !firestoreId) continue;

          const data: InasistenciaFirestore & { id?: string } = {
  ...(firestoreId ? { id: firestoreId } : {}),
    alumnoRef: doc(db, 'alumnos', ina.alumnoId) as any,
            cursoRef: doc(db, 'cursos', selectedCursoId) as any,
            anioLectivo: cicloLectivoActivo.anio,
            trimestre,
            cantidad,
            justificadas,
            noJustificadas: Math.max(0, cantidad - justificadas),
            registeredByRef: doc(db, 'users', user.uid) as any,
            registeredAt: null as any,
            updatedAt: null as any,
          };

          await upsertInasistencia(data);
          savedCount++;
        }
      }
      showMessage(`Inasistencias guardadas correctamente (${savedCount} registros)`);
    } catch {
      showMessage('Error al guardar inasistencias', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  if (!userData || !cicloLectivoActivo) {
    return <Center py="xl"><Loader /></Center>;
  }

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Title order={2}>Inasistencias</Title>
        <Text size="sm" c="dimmed">Ciclo lectivo {cicloLectivoActivo.anio}</Text>
      </Group>

      {message && (
        <Alert color={messageType === 'error' ? 'red' : 'green'} mb="md">
          {message}
        </Alert>
      )}

      <Select
        label="Curso"
        data={cursos.map((c) => ({ value: c.id, label: c.name }))}
        value={selectedCursoId}
        onChange={(v) => setSelectedCursoId(v ?? '')}
        placeholder="Seleccione un curso"
        searchable
        mb="md"
      />

      {selectedCursoId && (
        loading ? (
          <Center py="xl"><Loader /></Center>
        ) : alumnos.length > 0 ? (
          <>
            <TextInput
              placeholder="Buscar por apellido o nombre"
              value={searchText}
              onChange={(e) => setSearchText(e.currentTarget.value)}
              mb="sm"
            />
            <Box style={{ overflowX: 'auto' }}>
              <Table highlightOnHover verticalSpacing="xs" style={{ minWidth: 900 }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Apellido</Table.Th>
                    <Table.Th>Nombre</Table.Th>
                    <Table.Th>T1 Total</Table.Th>
                    <Table.Th>T1 Justif.</Table.Th>
                    <Table.Th>T2 Total</Table.Th>
                    <Table.Th>T2 Justif.</Table.Th>
                    <Table.Th>T3 Total</Table.Th>
                    <Table.Th>T3 Justif.</Table.Th>
                    <Table.Th>Total</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {inasistencias.filter((ina) => {
                    if (!searchText) return true;
                    const alumno = alumnos.find((a) => a.id === ina.alumnoId);
                    if (!alumno) return false;
                    const q = searchText.toLowerCase();
                    return alumno.lastName.toLowerCase().includes(q) || alumno.firstName.toLowerCase().includes(q);
                  }).map((ina) => {
                    const alumno = alumnos.find((a) => a.id === ina.alumnoId);
                    if (!alumno) return null;
                    const total = ina.t1_cantidad + ina.t2_cantidad + ina.t3_cantidad;
                    return (
                      <Table.Tr key={ina.alumnoId}>
                        <Table.Td>{alumno.lastName}</Table.Td>
                        <Table.Td>{alumno.firstName}</Table.Td>

                        {/* T1 */}
                        <Table.Td>
                          <NumberInput
                            value={ina.t1_cantidad}
                            onChange={(v) => handleChange(ina.alumnoId, 't1_cantidad', Number(v) || 0)}
                            min={0}
                            size="xs"
                            style={{ width: 70 }}
                          />
                        </Table.Td>
                        <Table.Td>
                          <NumberInput
                            value={ina.t1_justificadas}
                            onChange={(v) => handleChange(ina.alumnoId, 't1_justificadas', Number(v) || 0)}
                            min={0}
                            max={ina.t1_cantidad}
                            size="xs"
                            style={{ width: 70 }}
                          />
                        </Table.Td>

                        {/* T2 */}
                        <Table.Td>
                          <NumberInput
                            value={ina.t2_cantidad}
                            onChange={(v) => handleChange(ina.alumnoId, 't2_cantidad', Number(v) || 0)}
                            min={0}
                            size="xs"
                            style={{ width: 70 }}
                          />
                        </Table.Td>
                        <Table.Td>
                          <NumberInput
                            value={ina.t2_justificadas}
                            onChange={(v) => handleChange(ina.alumnoId, 't2_justificadas', Number(v) || 0)}
                            min={0}
                            max={ina.t2_cantidad}
                            size="xs"
                            style={{ width: 70 }}
                          />
                        </Table.Td>

                        {/* T3 */}
                        <Table.Td>
                          <NumberInput
                            value={ina.t3_cantidad}
                            onChange={(v) => handleChange(ina.alumnoId, 't3_cantidad', Number(v) || 0)}
                            min={0}
                            size="xs"
                            style={{ width: 70 }}
                          />
                        </Table.Td>
                        <Table.Td>
                          <NumberInput
                            value={ina.t3_justificadas}
                            onChange={(v) => handleChange(ina.alumnoId, 't3_justificadas', Number(v) || 0)}
                            min={0}
                            max={ina.t3_cantidad}
                            size="xs"
                            style={{ width: 70 }}
                          />
                        </Table.Td>

                        {/* Total acumulado — solo lectura */}
                        <Table.Td style={{ backgroundColor: '#f0f0f0' }}>
                          <Text size="sm" fw={600}>{total}</Text>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Box>

            <Group justify="flex-end" mt="md">
              <Button onClick={handleSave} loading={saving}>
                Guardar todo
              </Button>
            </Group>
          </>
        ) : (
          <Center py="xl">
            <Text c="dimmed">No hay alumnos en este curso</Text>
          </Center>
        )
      )}
    </Box>
  );
}