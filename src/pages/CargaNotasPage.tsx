import { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  Box,
  Button,
  Center,
  Group,
  Loader,
  Select,
  Stack,
  Table,
  Text,
  Title,
  Alert,
  TextInput,
} from '@mantine/core';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { useCalificacionesRules } from '../hooks/useCalificacionesRules';
import { calcCol4, calcCol8 } from '../utils/grading';
import {
  getAsignacionesByProfesor,
  getMateriasByCurso,
  getAlumnosByCurso,
  getCalificacionesByAlumno,
  upsertCalificacion,
  getCursos,
} from '../services/firebase/firestore';
import type {
  MateriaFirestore,
  AlumnoFirestore,
  CalificacionFirestore,
  CursoFirestore,
} from '../types/firestore';
import type { Col5State, Col6State, Col7State } from '../types/grading';

interface CalificacionDisplay {
  alumnoId: string;
  firestoreId?: string;
  col1: number | null;
  col2: number | null;
  col3: number | null;
  col5: Col5State;
  col6: Col6State;
  col7: Col7State;
}

interface AsignacionDisplay {
  id: string;
  label: string;
  cursoId: string;
  materiaId: string;
}

const defaultCol5 = (): Col5State => ({ value: null, estado: null, habilitado: false });
const defaultCol6 = (): Col6State => ({ value: null, estado: null, habilitado: false });
const defaultCol7 = (): Col7State => ({ value: null, estado: null, habilitado: false, motivoHabilitacion: null });

export default function CargaNotasPage() {
  const { user, userData, cicloLectivoActivo, isReadOnly } = useAuth();
  const esAdmin = userData?.role === 'admin';

  const [asignaciones, setAsignaciones] = useState<AsignacionDisplay[]>([]);
  const [selectedAsignacionId, setSelectedAsignacionId] = useState('');
  const [cursos, setCursos] = useState<(CursoFirestore & { id: string })[]>([]);
  const [selectedCursoId, setSelectedCursoId] = useState('');
  const [materias, setMaterias] = useState<(MateriaFirestore & { id: string })[]>([]);
  const [selectedMateriaId, setSelectedMateriaId] = useState('');
  const [alumnos, setAlumnos] = useState<(AlumnoFirestore & { id: string })[]>([]);
  const [calificaciones, setCalificaciones] = useState<CalificacionDisplay[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [saving, setSaving] = useState(false);
  const [firestoreCalificaciones, setFirestoreCalificaciones] = useState<CalificacionFirestore[]>([]);

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Notas_${cursos.find(c => c.id === selectedCursoId)?.name ?? selectedCursoId}_${materias.find(m => m.id === selectedMateriaId)?.name ?? selectedMateriaId}`,
  });

  const rules = useCalificacionesRules(
    cicloLectivoActivo
      ? {
          calificaciones: firestoreCalificaciones,
          cicloLectivo: cicloLectivoActivo,
          userPermissions: userData?.role === 'profesor'
            ? ['edit_calificaciones_trimestres']
            : ['edit_calificaciones_trimestres', 'edit_calificaciones_evaluacion'],
        }
      : null
  );

  const puedeEditarT1 = !isReadOnly && (esAdmin || (cicloLectivoActivo ? rules.puedeEditarT1 : false));
  const puedeEditarT2 = !isReadOnly && (esAdmin || (cicloLectivoActivo ? rules.puedeEditarT2 : false));
  const puedeEditarT3 = !isReadOnly && (esAdmin || (cicloLectivoActivo ? rules.puedeEditarT3 : false));
  const puedeEditarEvaluacion = !isReadOnly && (esAdmin || (cicloLectivoActivo ? rules.puedeEditarEvaluacion : false));

  const showMessage = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(null), 5000);
  };

  const loadAsignaciones = async () => {
    if (!user || userData?.role !== 'profesor' || !cicloLectivoActivo) return;
    setLoading(true);
    try {
      const asigsRaw = await getAsignacionesByProfesor(user.uid, cicloLectivoActivo.anio);
      const asigsWithLabels: AsignacionDisplay[] = (
        await Promise.all(
          asigsRaw.map(async (asig) => {
            try {
              const materiaDoc = await getDoc(asig.materiaRef);
              const cursoDoc = await getDoc(asig.cursoRef);
              const materia = materiaDoc.data() as MateriaFirestore | undefined;
              const curso = cursoDoc.data() as CursoFirestore | undefined;
              return {
                id: asig.id ?? '',
                label: `${materia?.name ?? 'Materia'} — ${curso?.name ?? 'Curso'}`,
                cursoId: asig.cursoRef.id,
                materiaId: asig.materiaRef.id,
              };
            } catch {
              return null;
            }
          })
        )
      ).filter((a): a is AsignacionDisplay => a !== null);
      setAsignaciones(asigsWithLabels);
    } catch {
      showMessage('Error al cargar asignaciones', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCursos = async () => {
    setLoading(true);
    try {
      const data = await getCursos();
      setCursos(data as (CursoFirestore & { id: string })[]);
    } catch {
      showMessage('Error al cargar cursos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMaterias = async (cursoId: string) => {
    setLoading(true);
    try {
      const data = await getMateriasByCurso(cursoId);
      setMaterias(data as (MateriaFirestore & { id: string })[]);
      setSelectedMateriaId('');
      setAlumnos([]);
      setCalificaciones([]);
    } catch {
      showMessage('Error al cargar materias', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAlumnosAndCalificaciones = async (cursoId: string, materiaId: string) => {
    if (!cicloLectivoActivo) return;
    setLoading(true);
    try {
      const alumnosData = await getAlumnosByCurso(cursoId, cicloLectivoActivo.anio);
      setAlumnos(alumnosData);

      const calMap: Record<string, CalificacionFirestore & { id: string }> = {};
      for (const alumno of alumnosData) {
        const cals = await getCalificacionesByAlumno(alumno.id, cicloLectivoActivo.anio);
        const calDeMateria = cals.find((c) => c.materiaRef.id === materiaId);
        if (calDeMateria) calMap[alumno.id] = calDeMateria;
      }

      setFirestoreCalificaciones(Object.values(calMap));

      const displayCals: CalificacionDisplay[] = alumnosData.map((alumno) => {
        const existing = calMap[alumno.id];
        return {
          alumnoId: alumno.id,
          firestoreId: existing?.id,
          col1: existing?.col1 ?? null,
          col2: existing?.col2 ?? null,
          col3: existing?.col3 ?? null,
          col5: existing?.col5 ?? defaultCol5(),
          col6: existing?.col6 ?? defaultCol6(),
          col7: existing?.col7 ?? defaultCol7(),
        };
      });

      setCalificaciones(displayCals);
    } catch {
      showMessage('Error al cargar alumnos y calificaciones', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userData?.role === 'profesor') {
      loadAsignaciones();
    } else {
      loadCursos();
    }
  }, [userData, cicloLectivoActivo]);

  useEffect(() => {
    if (userData?.role === 'profesor' && selectedAsignacionId) {
      const asig = asignaciones.find((a) => a.id === selectedAsignacionId);
      if (asig) {
        setSelectedCursoId(asig.cursoId);
        setSelectedMateriaId(asig.materiaId);
        loadAlumnosAndCalificaciones(asig.cursoId, asig.materiaId);
      }
    }
  }, [selectedAsignacionId]);

  useEffect(() => {
    if (userData?.role !== 'profesor' && selectedCursoId) {
      loadMaterias(selectedCursoId);
    }
  }, [selectedCursoId]);

  useEffect(() => {
    if (userData?.role !== 'profesor' && selectedCursoId && selectedMateriaId) {
      loadAlumnosAndCalificaciones(selectedCursoId, selectedMateriaId);
    }
  }, [selectedMateriaId]);

  const handleTrimChange = (alumnoId: string, col: 'col1' | 'col2' | 'col3', value: string) => {
    const num = value === '' ? null : Number(value);
    setCalificaciones((prev) =>
      prev.map((cal) => cal.alumnoId === alumnoId ? { ...cal, [col]: num } : cal)
    );
  };

  const handleEvalChange = (alumnoId: string, col: 'col5' | 'col6' | 'col7', value: string) => {
    setCalificaciones((prev) =>
      prev.map((cal) => {
        if (cal.alumnoId !== alumnoId) return cal;
        const isAusente = value.toLowerCase() === 'ausente';
        const num = isAusente || value === '' ? null : Number(value);
        return {
          ...cal,
          [col]: {
            ...cal[col],
            value: num,
            estado: isAusente ? 'ausente' : value === '' ? null : 'normal',
          },
        };
      })
    );
  };

  const handleSave = async () => {
    if (!selectedCursoId || !selectedMateriaId || !cicloLectivoActivo) {
      showMessage('Seleccione curso y materia', 'error');
      return;
    }
    setSaving(true);
    let savedCount = 0;
    try {
      for (const cal of calificaciones) {
        if (
          cal.col1 === null &&
          cal.col2 === null &&
          cal.col3 === null &&
          cal.col5.value === null &&
          cal.col5.estado === null &&
          cal.col6.value === null &&
          cal.col6.estado === null
        ) continue;

        const col4Result = calcCol4({ col1: cal.col1, col2: cal.col2, col3: cal.col3 });

        const col5Saved: Col5State = { ...cal.col5, habilitado: rules.puedeCargarcol5(cal) };
        const col6Saved: Col6State = { ...cal.col6, habilitado: rules.puedeCargarcol6(cal) };
        const col7Saved: Col7State = { ...cal.col7, habilitado: rules.col7PeriodoHabilitado };

        const col8Result = calcCol8({
          col4: col4Result.value,
          col3: cal.col3,
          col5: col5Saved,
          col6: col6Saved,
          col7: col7Saved,
        });

        const data: CalificacionFirestore & { id?: string } = {
          ...(cal.firestoreId ? { id: cal.firestoreId } : {}),
          alumnoRef: doc(db, 'alumnos', cal.alumnoId) as any,
          cursoRef: doc(db, 'cursos', selectedCursoId) as any,
          materiaRef: doc(db, 'cursos', selectedCursoId, 'materias', selectedMateriaId) as any,
          ...(selectedAsignacionId
            ? { asignacionRef: doc(db, 'asignaciones', selectedAsignacionId) as any }
            : {}),
          anioLectivo: cicloLectivoActivo.anio,
          col1: cal.col1,
          col2: cal.col2,
          col3: cal.col3,
          col5: col5Saved,
          col6: col6Saved,
          col7: col7Saved,
          col8: { value: col8Result.value, estado: col8Result.estado },
          previaActiva: false,
          promocion: 'aprobado',
          updatedAt: null as any,
          updatedByRef: doc(db, 'users', user!.uid) as any,
          createdAt: null as any,
        };

        await upsertCalificacion(data, cicloLectivoActivo.estado);
        savedCount++;
      }
      showMessage(`${savedCount} calificaciones guardadas correctamente`);
    } catch {
      showMessage('Error al guardar calificaciones', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getCol4Display = (cal: CalificacionDisplay): string => {
    const result = calcCol4({ col1: cal.col1, col2: cal.col2, col3: cal.col3 });
    return result.formatted ?? '—';
  };

  const getCol8Display = (cal: CalificacionDisplay): string => {
    const col4Result = calcCol4({ col1: cal.col1, col2: cal.col2, col3: cal.col3 });
    const result = calcCol8({
      col4: col4Result.value,
      col3: cal.col3,
      col5: cal.col5,
      col6: cal.col6,
      col7: cal.col7,
    });
    if (result.estado === 'ausente') return 'Ausente';
    return result.value !== null ? String(result.value) : '—';
  };

  const getEvalDisplay = (col: Col5State | Col6State | Col7State): string => {
    if (col.estado === 'ausente') return 'ausente';
    return col.value !== null ? String(col.value) : '';
  };

  if (!user || !userData || !cicloLectivoActivo) {
    return <Center py="xl"><Loader /></Center>;
  }

  const isProfesor = userData.role === 'profesor';
  const cursoNombre = cursos.find(c => c.id === selectedCursoId)?.name ?? '';
  const materiaNombre = materias.find(m => m.id === selectedMateriaId)?.name ?? '';

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Title order={2}>Carga de Notas</Title>
        <Text size="sm" c="dimmed">Ciclo lectivo {cicloLectivoActivo.anio}</Text>
      </Group>

      {message && (
        <Alert color={messageType === 'error' ? 'red' : 'green'} mb="md">
          {message}
        </Alert>
      )}

      <Stack gap="md" mb="md">
        {isProfesor ? (
          <Select
            label="Asignación"
            data={asignaciones.map((a) => ({ value: a.id, label: a.label }))}
            value={selectedAsignacionId}
            onChange={(v) => setSelectedAsignacionId(v ?? '')}
            placeholder="Seleccione una asignación"
            searchable
          />
        ) : (
          <>
            <Select
              label="Curso"
              data={cursos.map((c) => ({ value: c.id, label: c.name }))}
              value={selectedCursoId}
              onChange={(v) => setSelectedCursoId(v ?? '')}
              placeholder="Seleccione un curso"
              searchable
            />
            {selectedCursoId && (
              <Select
                label="Materia"
                data={materias.map((m) => ({ value: m.id, label: m.name }))}
                value={selectedMateriaId}
                onChange={(v) => setSelectedMateriaId(v ?? '')}
                placeholder="Seleccione una materia"
                searchable
              />
            )}
          </>
        )}
      </Stack>

      {selectedCursoId && selectedMateriaId && (
        loading ? (
          <Center py="xl"><Loader /></Center>
        ) : alumnos.length > 0 ? (
          <>
            <Box style={{ overflowX: 'auto' }}>
              <Table highlightOnHover verticalSpacing="xs" style={{ minWidth: 900 }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Apellido</Table.Th>
                    <Table.Th>Nombre</Table.Th>
                    <Table.Th>T1</Table.Th>
                    <Table.Th>T2</Table.Th>
                    <Table.Th>T3</Table.Th>
                    <Table.Th>Promedio</Table.Th>
                    <Table.Th>Dic</Table.Th>
                    <Table.Th>Feb</Table.Th>
                    <Table.Th>Adic</Table.Th>
                    <Table.Th>Final</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {calificaciones.map((cal) => {
                    const alumno = alumnos.find((a) => a.id === cal.alumnoId);
                    if (!alumno) return null;
                    return (
                      <Table.Tr key={cal.alumnoId}>
                        <Table.Td>{alumno.lastName}</Table.Td>
                        <Table.Td>{alumno.firstName}</Table.Td>

                        <Table.Td style={{ backgroundColor: puedeEditarT1 ? 'white' : '#f5f5f5' }}>
                          {puedeEditarT1 ? (
                            <TextInput
                              value={cal.col1 !== null ? String(cal.col1) : ''}
                              onChange={(e) => handleTrimChange(cal.alumnoId, 'col1', e.currentTarget.value)}
                              placeholder="—"
                              size="xs"
                              style={{ width: 60 }}
                            />
                          ) : <Text size="sm">{cal.col1 ?? '—'}</Text>}
                        </Table.Td>

                        <Table.Td style={{ backgroundColor: puedeEditarT2 ? 'white' : '#f5f5f5' }}>
                          {puedeEditarT2 ? (
                            <TextInput
                              value={cal.col2 !== null ? String(cal.col2) : ''}
                              onChange={(e) => handleTrimChange(cal.alumnoId, 'col2', e.currentTarget.value)}
                              placeholder="—"
                              size="xs"
                              style={{ width: 60 }}
                            />
                          ) : <Text size="sm">{cal.col2 ?? '—'}</Text>}
                        </Table.Td>

                        <Table.Td style={{ backgroundColor: puedeEditarT3 ? 'white' : '#f5f5f5' }}>
                          {puedeEditarT3 ? (
                            <TextInput
                              value={cal.col3 !== null ? String(cal.col3) : ''}
                              onChange={(e) => handleTrimChange(cal.alumnoId, 'col3', e.currentTarget.value)}
                              placeholder="—"
                              size="xs"
                              style={{ width: 60 }}
                            />
                          ) : <Text size="sm">{cal.col3 ?? '—'}</Text>}
                        </Table.Td>

                        <Table.Td style={{ backgroundColor: '#f0f0f0' }}>
                          <Text size="sm" fw={600}>{getCol4Display(cal)}</Text>
                        </Table.Td>

                        <Table.Td style={{ backgroundColor: puedeEditarEvaluacion && rules.col5PeriodoHabilitado ? 'white' : '#f5f5f5' }}>
                          {puedeEditarEvaluacion && rules.col5PeriodoHabilitado && rules.puedeCargarcol5(cal) ? (
                            <TextInput
                              value={getEvalDisplay(cal.col5)}
                              onChange={(e) => handleEvalChange(cal.alumnoId, 'col5', e.currentTarget.value)}
                              placeholder="—"
                              size="xs"
                              style={{ width: 70 }}
                            />
                          ) : <Text size="sm">{getEvalDisplay(cal.col5) || '—'}</Text>}
                        </Table.Td>

                        <Table.Td style={{ backgroundColor: puedeEditarEvaluacion && rules.col6PeriodoHabilitado ? 'white' : '#f5f5f5' }}>
                          {puedeEditarEvaluacion && rules.col6PeriodoHabilitado ? (
                            <TextInput
                              value={getEvalDisplay(cal.col6)}
                              onChange={(e) => handleEvalChange(cal.alumnoId, 'col6', e.currentTarget.value)}
                              placeholder="—"
                              size="xs"
                              style={{ width: 70 }}
                            />
                          ) : <Text size="sm">{getEvalDisplay(cal.col6) || '—'}</Text>}
                        </Table.Td>

                        <Table.Td style={{ backgroundColor: puedeEditarEvaluacion && rules.col7PeriodoHabilitado ? 'white' : '#f5f5f5' }}>
                          {puedeEditarEvaluacion && rules.col7PeriodoHabilitado ? (
                            <TextInput
                              value={getEvalDisplay(cal.col7)}
                              onChange={(e) => handleEvalChange(cal.alumnoId, 'col7', e.currentTarget.value)}
                              placeholder="—"
                              size="xs"
                              style={{ width: 70 }}
                            />
                          ) : <Text size="sm">{getEvalDisplay(cal.col7) || '—'}</Text>}
                        </Table.Td>

                        <Table.Td style={{ backgroundColor: '#f0f0f0' }}>
                          <Text size="sm" fw={600}>{getCol8Display(cal)}</Text>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Box>

            <Group justify="flex-end" mt="md" gap="xs">
              <Button variant="outline" onClick={handlePrint}>
                Descargar PDF
              </Button>
              {!isReadOnly && (
                <Button onClick={handleSave} loading={saving}>
                  Guardar todo
                </Button>
              )}
            </Group>

            {/* Componente oculto para imprimir */}
            <div style={{ display: 'none' }}>
              <div ref={printRef}>
                <div style={{
                  padding: '15mm',
                  fontFamily: 'Arial, sans-serif',
                  fontSize: '11px',
                }}>
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <div style={{ fontWeight: 'bold', fontSize: 14 }}>
                      Colegio Preuniversitario Dr. Ramón A. Cereijo — UBA Escobar
                    </div>
                    <div style={{ marginTop: 4 }}>
                      Registro de calificaciones — Ciclo lectivo {cicloLectivoActivo.anio}
                    </div>
                    <div style={{ marginTop: 4, fontWeight: 'bold' }}>
                      Curso: {cursoNombre} — Materia: {materiaNombre}
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#e0e0e0' }}>
                        <th style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'left' }}>Apellido</th>
                        <th style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'left' }}>Nombre</th>
                        <th style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center' }}>T1</th>
                        <th style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center' }}>T2</th>
                        <th style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center' }}>T3</th>
                        <th style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center' }}>Nota Final</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calificaciones.map((cal) => {
                        const alumno = alumnos.find((a) => a.id === cal.alumnoId);
                        if (!alumno) return null;
                        return (
                          <tr key={cal.alumnoId}>
                            <td style={{ border: '1px solid #000', padding: '3px 8px' }}>{alumno.lastName}</td>
                            <td style={{ border: '1px solid #000', padding: '3px 8px' }}>{alumno.firstName}</td>
                            <td style={{ border: '1px solid #000', padding: '3px 8px', textAlign: 'center' }}>{cal.col1 ?? '—'}</td>
                            <td style={{ border: '1px solid #000', padding: '3px 8px', textAlign: 'center' }}>{cal.col2 ?? '—'}</td>
                            <td style={{ border: '1px solid #000', padding: '3px 8px', textAlign: 'center' }}>{cal.col3 ?? '—'}</td>
                            <td style={{ border: '1px solid #000', padding: '3px 8px', textAlign: 'center', fontWeight: 'bold' }}>
                              {getCol8Display(cal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div style={{ marginTop: 48, display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ textAlign: 'center', width: '30%' }}>
                      <div style={{ borderTop: '1px solid #000', paddingTop: 4 }}>
                        Firma del docente
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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