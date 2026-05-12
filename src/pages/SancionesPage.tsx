import { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  Box,
  Button,
  Center,
  Group,
  Loader,
  NumberInput,
  Select,
  Table,
  Text,
  Title,
  Alert,
  Modal,
  Stack,
  TextInput,
  Textarea,
  Badge,
} from '@mantine/core';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import {
  getCursos,
  getAlumnosByCurso,
  getSancionesByAlumno,
  addSancion,
  updateSancion,
  getConfigInstitucional,
} from '../services/firebase/firestore';
import { doc } from 'firebase/firestore';
import { db } from '../services/firebase/firebaseConfig';
import type {
  AlumnoFirestore,
  CursoFirestore,
  SancionFirestore,
  ConfigInstitucional,
} from '../types/firestore';

// ============================================================================
// TYPES
// ============================================================================

type SancionDoc = SancionFirestore & { id: string };
type AlumnoDoc = AlumnoFirestore & { id: string };

// ============================================================================
// COMPONENT
// ============================================================================

export default function SancionesPage() {
  const { user, userData, cicloLectivoActivo, isReadOnly } = useAuth();

  const [cursos, setCursos] = useState<(CursoFirestore & { id: string })[]>([]);
  const [selectedCursoId, setSelectedCursoId] = useState('');
  const [alumnos, setAlumnos] = useState<AlumnoDoc[]>([]);
  const [selectedAlumnoId, setSelectedAlumnoId] = useState('');
  const [sanciones, setSanciones] = useState<SancionDoc[]>([]);
  const [config, setConfig] = useState<ConfigInstitucional | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

  // Modal nueva sanción
  const [modalOpen, setModalOpen] = useState(false);
  const [tipo, setTipo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cantidad, setCantidad] = useState<number>(1);
  const [duracionDias, setDuracionDias] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal editar sanción
  const [editModal, setEditModal] = useState(false);
  const [editSancion, setEditSancion] = useState<SancionDoc | null>(null);
  const [editTipo, setEditTipo] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editCantidad, setEditCantidad] = useState<number>(1);
  const [editDuracionDias, setEditDuracionDias] = useState('');

  const tipoOptions = [
    { value: 'amonestación', label: 'Amonestación' },
    { value: 'suspensión', label: 'Suspensión' },
    { value: 'nota de menor', label: 'Nota de menor' },
    { value: 'otra', label: 'Otra' },
  ];

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
        const [cursosData, configData] = await Promise.all([getCursos(), getConfigInstitucional()]);
        setCursos(cursosData);
        setConfig(configData);
      } catch {
        showMessage('Error al cargar cursos', 'error');
      }
    };
    load();
  }, []);

  // ========================================================================
  // LOAD ALUMNOS
  // ========================================================================

  useEffect(() => {
    if (!selectedCursoId || !cicloLectivoActivo) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getAlumnosByCurso(selectedCursoId, cicloLectivoActivo.anio);
        setAlumnos(data);
        setSelectedAlumnoId('');
        setSanciones([]);
      } catch {
        showMessage('Error al cargar alumnos', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedCursoId, cicloLectivoActivo]);

  // ========================================================================
  // LOAD SANCIONES
  // ========================================================================

  useEffect(() => {
    if (!selectedAlumnoId || !cicloLectivoActivo) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getSancionesByAlumno(selectedAlumnoId, cicloLectivoActivo.anio);
        setSanciones(data as SancionDoc[]);
      } catch {
        showMessage('Error al cargar sanciones', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedAlumnoId, cicloLectivoActivo]);

  // ========================================================================
  // AGREGAR SANCIÓN
  // ========================================================================

  const handleAddSancion = async () => {
    if (!selectedAlumnoId || !selectedCursoId || !tipo || !descripcion || !cicloLectivoActivo || !user) {
      showMessage('Complete todos los campos requeridos', 'error');
      return;
    }

    setSaving(true);
    try {
      await addSancion({
        alumnoRef: doc(db, 'alumnos', selectedAlumnoId) as any,
        cursoRef: doc(db, 'cursos', selectedCursoId) as any,
        anioLectivo: cicloLectivoActivo.anio,
        fecha: Timestamp.now(),
        tipo,
        descripcion,
        cantidad,
        ...(duracionDias ? { duracionDias: Number(duracionDias) } : {}),
        activo: true,
        autorRef: doc(db, 'users', user.uid) as any,
      });

      setModalOpen(false);
      setTipo('');
      setDescripcion('');
      setCantidad(1);
      setDuracionDias('');

      // Recargar sanciones
      const data = await getSancionesByAlumno(selectedAlumnoId, cicloLectivoActivo.anio);
      setSanciones(data as SancionDoc[]);
      showMessage('Sanción registrada correctamente');
    } catch {
      showMessage('Error al registrar sanción', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ========================================================================
  // EDITAR SANCIÓN
  // ========================================================================

  const openEditModal = (sancion: SancionDoc) => {
    setEditSancion(sancion);
    setEditTipo(sancion.tipo);
    setEditDescripcion(sancion.descripcion);
    setEditCantidad(sancion.cantidad ?? 1);
    setEditDuracionDias(sancion.duracionDias ? String(sancion.duracionDias) : '');
    setEditModal(true);
  };

  const handleEditSancion = async () => {
    if (!editSancion) return;
    setSaving(true);
    try {
      await updateSancion(editSancion.id, {
        tipo: editTipo,
        descripcion: editDescripcion,
        cantidad: editCantidad,
        duracionDias: editDuracionDias ? Number(editDuracionDias) : undefined,
      });
      setEditModal(false);
      setEditSancion(null);

      if (selectedAlumnoId && cicloLectivoActivo) {
        const data = await getSancionesByAlumno(selectedAlumnoId, cicloLectivoActivo.anio);
        setSanciones(data as SancionDoc[]);
      }
      showMessage('Sanción actualizada correctamente');
    } catch {
      showMessage('Error al actualizar sanción', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ========================================================================
  // DESACTIVAR SANCIÓN
  // ========================================================================

  const handleDesactivar = async (sancionId: string) => {
    try {
      await updateSancion(sancionId, { activo: false });
      if (selectedAlumnoId && cicloLectivoActivo) {
        const data = await getSancionesByAlumno(selectedAlumnoId, cicloLectivoActivo.anio);
        setSanciones(data as SancionDoc[]);
      }
      showMessage('Sanción desactivada');
    } catch {
      showMessage('Error al desactivar sanción', 'error');
    }
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  if (!userData || !cicloLectivoActivo) {
    return <Center py="xl"><Loader /></Center>;
  }

  const alumnoSeleccionado = alumnos.find((a) => a.id === selectedAlumnoId);

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Title order={2}>Sanciones</Title>
        <Text size="sm" c="dimmed">Ciclo lectivo {cicloLectivoActivo.anio}</Text>
      </Group>

      {message && (
        <Alert color={messageType === 'error' ? 'red' : 'green'} mb="md">
          {message}
        </Alert>
      )}

      <Group align="flex-end" mb="md" gap="md">
        <Select
          label="Curso"
          data={cursos.map((c) => ({ value: c.id, label: c.name }))}
          value={selectedCursoId}
          onChange={(v) => setSelectedCursoId(v ?? '')}
          placeholder="Seleccione un curso"
          searchable
          style={{ flex: 1 }}
        />
        {selectedCursoId && (
          <Select
            label="Alumno"
            data={alumnos.map((a) => ({
              value: a.id,
              label: `${a.lastName}, ${a.firstName}`,
            }))}
            value={selectedAlumnoId}
            onChange={(v) => setSelectedAlumnoId(v ?? '')}
            placeholder="Seleccione un alumno"
            searchable
            style={{ flex: 2 }}
          />
        )}
        {selectedAlumnoId && !isReadOnly && (
          <Button onClick={() => setModalOpen(true)}>
            + Nueva sanción
          </Button>
        )}
      </Group>

      {selectedAlumnoId && (
        loading ? (
          <Center py="xl"><Loader /></Center>
        ) : (
          <>
            {alumnoSeleccionado && (
              <Text fw={600} mb="sm">
                {alumnoSeleccionado.lastName}, {alumnoSeleccionado.firstName}
                {' '}— {sanciones.length} sanción{sanciones.length !== 1 ? 'es' : ''}
              </Text>
            )}

            {sanciones.length === 0 ? (
              <Center py="xl">
                <Text c="dimmed">Este alumno no tiene sanciones registradas</Text>
              </Center>
            ) : (
              <>
                <Table highlightOnHover verticalSpacing="sm" mb="md">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Fecha</Table.Th>
                      <Table.Th>Tipo</Table.Th>
                      <Table.Th>Descripción</Table.Th>
                      <Table.Th>Cantidad</Table.Th>
                      <Table.Th>Duración</Table.Th>
                      <Table.Th>Estado</Table.Th>
                      <Table.Th>Acciones</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {sanciones.map((sancion) => {
                      const fecha = sancion.fecha
                        ? new Date(sancion.fecha.seconds * 1000).toLocaleDateString('es-AR')
                        : '—';
                      return (
                        <Table.Tr key={sancion.id}>
                          <Table.Td>{fecha}</Table.Td>
                          <Table.Td>{sancion.tipo}</Table.Td>
                          <Table.Td>{sancion.descripcion}</Table.Td>
                          <Table.Td style={{ textAlign: 'center' }}>{sancion.cantidad ?? 1}</Table.Td>
                          <Table.Td>
                            {sancion.duracionDias ? `${sancion.duracionDias} día${sancion.duracionDias !== 1 ? 's' : ''}` : '—'}
                          </Table.Td>
                          <Table.Td>
                            <Badge color={sancion.activo ? 'red' : 'gray'}>
                              {sancion.activo ? 'Activa' : 'Inactiva'}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            {!isReadOnly ? (
                              <Group gap="xs">
                                <Button
                                  variant="outline"
                                  size="xs"
                                  onClick={() => openEditModal(sancion)}
                                >
                                  Editar
                                </Button>
                                {sancion.activo && (
                                  <Button
                                    variant="outline"
                                    color="gray"
                                    size="xs"
                                    onClick={() => handleDesactivar(sancion.id)}
                                  >
                                    Desactivar
                                  </Button>
                                )}
                              </Group>
                            ) : (
                              <Text size="xs" c="dimmed">—</Text>
                            )}
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
                <Group justify="flex-end">
                  <Button variant="outline" onClick={() => handlePrint()}>
                    Imprimir historial
                  </Button>
                </Group>
              </>
            )}
          </>
        )
      )}

      {/* Contenido oculto para impresión */}
      <div style={{ display: 'none' }}>
        <div ref={printRef}>
          {alumnoSeleccionado && (
            <div style={{ width: '210mm', minHeight: '297mm', padding: '15mm', fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#000', backgroundColor: '#fff', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <img src="/logos/logo-blanco.png" alt="Logo Colegio" style={{ height: 80, objectFit: 'contain' }} />
                <img src="/logos/logo-muni.png" alt="Logo Municipalidad" style={{ height: 80, objectFit: 'contain' }} />
              </div>
              <div style={{ border: '1px solid #000', textAlign: 'center', padding: '6px', marginBottom: 8 }}>
                <strong style={{ fontSize: 13 }}>Historial de Sanciones — Año {cicloLectivoActivo.anio}</strong>
              </div>
              <div style={{ border: '1px solid #000', borderTop: 'none', textAlign: 'center', padding: '4px', marginBottom: 12 }}>
                <div>Colegio Preuniversitario Dr. Ramón A. Cereijo</div>
                <div>UBA — Escobar</div>
              </div>
              <div style={{ display: 'flex', border: '1px solid #000', marginBottom: 16 }}>
                <div style={{ flex: 3, padding: '4px 8px', borderRight: '1px solid #000' }}>
                  <span style={{ marginRight: 8 }}>Estudiante:</span>
                  <strong>{alumnoSeleccionado.lastName}, {alumnoSeleccionado.firstName}</strong>
                </div>
                <div style={{ flex: 1, padding: '4px 8px' }}>
                  <span style={{ marginRight: 8 }}>Curso:</span>
                  <strong>{cursos.find((c) => c.id === selectedCursoId)?.name ?? ''}</strong>
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f0f0' }}>
                    <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>Fecha</th>
                    <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>Tipo</th>
                    <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>Descripción</th>
                    <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>Cantidad</th>
                    <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>Duración</th>
                  </tr>
                </thead>
                <tbody>
                  {sanciones.map((s) => (
                    <tr key={s.id}>
                      <td style={{ border: '1px solid #000', padding: '3px 6px' }}>
                        {new Date(s.fecha.seconds * 1000).toLocaleDateString('es-AR')}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '3px 6px' }}>{s.tipo}</td>
                      <td style={{ border: '1px solid #000', padding: '3px 6px' }}>{s.descripcion}</td>
                      <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center' }}>{s.cantidad ?? 1}</td>
                      <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center' }}>
                        {s.duracionDias ? `${s.duracionDias} día${s.duracionDias !== 1 ? 's' : ''}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ border: '1px solid #000', padding: '6px 8px', marginBottom: 40, fontWeight: 'bold' }}>
                Total de sanciones: {sanciones.reduce((acc, s) => acc + (s.cantidad ?? 1), 0)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 60 }}>
                {config?.firma1Nombre && (
                  <div style={{ textAlign: 'center', width: '30%' }}>
                    <div style={{ borderTop: '1px solid #000', paddingTop: 4 }}>
                      <div>{config.firma1Nombre}</div>
                      <div>{config.firma1Cargo}</div>
                    </div>
                  </div>
                )}
                {config?.firma2Nombre && (
                  <div style={{ textAlign: 'center', width: '30%' }}>
                    <div style={{ borderTop: '1px solid #000', paddingTop: 4 }}>
                      <div>{config.firma2Nombre}</div>
                      <div>{config.firma2Cargo}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal nueva sanción */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nueva sanción"
      >
        <Stack>
          <Select
            label="Tipo"
            data={tipoOptions}
            value={tipo}
            onChange={(v) => setTipo(v ?? '')}
            placeholder="Seleccione el tipo"
            required
          />
          <Textarea
            label="Descripción"
            value={descripcion}
            onChange={(e) => setDescripcion(e.currentTarget.value)}
            placeholder="Describa la sanción"
            required
            minRows={3}
          />
          <NumberInput
            label="Cantidad de sanciones"
            value={cantidad}
            onChange={(v) => setCantidad(typeof v === 'number' ? v : 1)}
            min={1}
          />
          <TextInput
            label="Duración en días (opcional)"
            type="number"
            value={duracionDias}
            onChange={(e) => setDuracionDias(e.currentTarget.value)}
            placeholder="Solo para suspensiones"
          />
          <Group justify="flex-end">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddSancion} loading={saving}>
              Registrar
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal editar sanción */}
      <Modal
        opened={editModal}
        onClose={() => setEditModal(false)}
        title="Editar sanción"
      >
        <Stack>
          <Select
            label="Tipo"
            data={tipoOptions}
            value={editTipo}
            onChange={(v) => setEditTipo(v ?? '')}
            placeholder="Seleccione el tipo"
            required
          />
          <Textarea
            label="Descripción"
            value={editDescripcion}
            onChange={(e) => setEditDescripcion(e.currentTarget.value)}
            placeholder="Describa la sanción"
            required
            minRows={3}
          />
          <NumberInput
            label="Cantidad de sanciones"
            value={editCantidad}
            onChange={(v) => setEditCantidad(typeof v === 'number' ? v : 1)}
            min={1}
          />
          <TextInput
            label="Duración en días (opcional)"
            type="number"
            value={editDuracionDias}
            onChange={(e) => setEditDuracionDias(e.currentTarget.value)}
            placeholder="Solo para suspensiones"
          />
          <Group justify="flex-end">
            <Button variant="outline" onClick={() => setEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditSancion} loading={saving}>
              Guardar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}