import { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  Box,
  Button,
  Center,
  Group,
  Loader,
  Select,
  Table,
  Text,
  Title,
  Alert,
} from '@mantine/core';
import { useAuth } from '../contexts/AuthContext';
import {
  getCursos,
  getAlumnosByCurso,
  getSancionesByAlumno,
  getConfigInstitucional,
} from '../services/firebase/firestore';
import type {
  AlumnoFirestore,
  CursoFirestore,
  SancionFirestore,
  ConfigInstitucional,
} from '../types/firestore';

// ============================================================================
// TYPES
// ============================================================================

type AlumnoDoc = AlumnoFirestore & { id: string };
type SancionDoc = SancionFirestore & { id: string };

// ============================================================================
// COMPONENTE IMPRIMIBLE
// ============================================================================

interface HistorialImprimibleProps {
  alumno: AlumnoDoc;
  cursoNombre: string;
  anio: number;
  sanciones: SancionDoc[];
  config: ConfigInstitucional | null;
}

function HistorialImprimible({ alumno, cursoNombre, anio, sanciones, config }: HistorialImprimibleProps) {
  const total = sanciones.reduce((acc, s) => acc + (s.cantidad ?? 1), 0);

  return (
    <div style={{
      width: '210mm',
      minHeight: '297mm',
      padding: '15mm',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      color: '#000',
      backgroundColor: '#fff',
      boxSizing: 'border-box',
    }}>
      {/* LOGOS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <img src="/logos/logo-blanco.png" alt="Logo Colegio" style={{ height: 80, objectFit: 'contain' }} />
        <img src="/logos/logo-muni.png" alt="Logo Municipalidad" style={{ height: 80, objectFit: 'contain' }} />
      </div>

      {/* TÍTULO */}
      <div style={{ border: '1px solid #000', textAlign: 'center', padding: '6px', marginBottom: 8 }}>
        <strong style={{ fontSize: 13 }}>Historial de Sanciones — Año {anio}</strong>
      </div>

      {/* NOMBRE DEL COLEGIO */}
      <div style={{ border: '1px solid #000', borderTop: 'none', textAlign: 'center', padding: '4px', marginBottom: 12 }}>
        <div>Colegio Preuniversitario Dr. Ramón A. Cereijo</div>
        <div>UBA — Escobar</div>
      </div>

      {/* ALUMNO Y CURSO */}
      <div style={{ display: 'flex', border: '1px solid #000', borderTop: 'none', marginBottom: 16 }}>
        <div style={{ flex: 3, padding: '4px 8px', borderRight: '1px solid #000' }}>
          <span style={{ marginRight: 8 }}>Estudiante:</span>
          <strong>{alumno.lastName}, {alumno.firstName}</strong>
        </div>
        <div style={{ flex: 1, padding: '4px 8px' }}>
          <span style={{ marginRight: 8 }}>Curso:</span>
          <strong>{cursoNombre}</strong>
        </div>
      </div>

      {/* TABLA DE SANCIONES */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr style={{ backgroundColor: '#f0f0f0' }}>
            <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>Fecha</th>
            <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>Tipo</th>
            <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>Descripción</th>
            <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>Cantidad</th>
            <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>Duración</th>
            <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>Registrado por</th>
          </tr>
        </thead>
        <tbody>
          {sanciones.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                Sin sanciones registradas
              </td>
            </tr>
          ) : (
            sanciones.map((s) => (
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
                <td style={{ border: '1px solid #000', padding: '3px 6px' }}>
                  {s.autorRef?.id ?? '—'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* TOTAL */}
      <div style={{ border: '1px solid #000', padding: '6px 8px', marginBottom: 40, fontWeight: 'bold' }}>
        Total de sanciones: {total}
      </div>

      {/* FIRMA */}
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
  );
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function ReportesSancionesPage() {
  const { cicloLectivoActivo } = useAuth();

  const [cursos, setCursos] = useState<(CursoFirestore & { id: string })[]>([]);
  const [selectedCursoId, setSelectedCursoId] = useState('');
  const [alumnos, setAlumnos] = useState<AlumnoDoc[]>([]);
  const [selectedAlumnoId, setSelectedAlumnoId] = useState('');
  const [sanciones, setSanciones] = useState<SancionDoc[]>([]);
  const [config, setConfig] = useState<ConfigInstitucional | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 5000);
  };

  // ========================================================================
  // LOAD CURSOS + CONFIG
  // ========================================================================

  useEffect(() => {
    const load = async () => {
      try {
        const [cursosData, configData] = await Promise.all([
          getCursos(),
          getConfigInstitucional(),
        ]);
        setCursos(cursosData);
        setConfig(configData);
      } catch {
        showMessage('Error al cargar datos');
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
        showMessage('Error al cargar alumnos');
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
        showMessage('Error al cargar sanciones');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedAlumnoId, cicloLectivoActivo]);

  // ========================================================================
  // RENDER
  // ========================================================================

  if (!cicloLectivoActivo) {
    return <Center py="xl"><Loader /></Center>;
  }

  const alumnoSeleccionado = alumnos.find((a) => a.id === selectedAlumnoId);
  const cursoSeleccionado = cursos.find((c) => c.id === selectedCursoId);
  const total = sanciones.reduce((acc, s) => acc + (s.cantidad ?? 1), 0);

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Title order={2}>Historial de Sanciones</Title>
        <Text size="sm" c="dimmed">Ciclo lectivo {cicloLectivoActivo.anio}</Text>
      </Group>

      {message && (
        <Alert color="red" mb="md">{message}</Alert>
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
        {selectedAlumnoId && (
          <Button onClick={() => handlePrint()}>
            Imprimir historial
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
                {' '}— {sanciones.length} registro{sanciones.length !== 1 ? 's' : ''}, {total} sanción{total !== 1 ? 'es' : ''} en total
              </Text>
            )}

            {sanciones.length === 0 ? (
              <Center py="xl">
                <Text c="dimmed">Este alumno no tiene sanciones registradas</Text>
              </Center>
            ) : (
              <Table highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Fecha</Table.Th>
                    <Table.Th>Tipo</Table.Th>
                    <Table.Th>Descripción</Table.Th>
                    <Table.Th>Cantidad</Table.Th>
                    <Table.Th>Duración</Table.Th>
                    <Table.Th>Registrado por</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {sanciones.map((s) => (
                    <Table.Tr key={s.id}>
                      <Table.Td>
                        {new Date(s.fecha.seconds * 1000).toLocaleDateString('es-AR')}
                      </Table.Td>
                      <Table.Td>{s.tipo}</Table.Td>
                      <Table.Td>{s.descripcion}</Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>{s.cantidad ?? 1}</Table.Td>
                      <Table.Td>
                        {s.duracionDias ? `${s.duracionDias} día${s.duracionDias !== 1 ? 's' : ''}` : '—'}
                      </Table.Td>
                      <Table.Td>{s.autorRef?.id ?? '—'}</Table.Td>
                    </Table.Tr>
                  ))}
                  <Table.Tr style={{ fontWeight: 'bold', backgroundColor: '#f8f9fa' }}>
                    <Table.Td colSpan={3}>Total</Table.Td>
                    <Table.Td style={{ textAlign: 'center' }}>{total}</Table.Td>
                    <Table.Td colSpan={2}></Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            )}
          </>
        )
      )}

      {/* Contenido oculto para impresión */}
      <div style={{ display: 'none' }}>
        <div ref={printRef}>
          {alumnoSeleccionado && cursoSeleccionado && (
            <HistorialImprimible
              alumno={alumnoSeleccionado}
              cursoNombre={cursoSeleccionado.name}
              anio={cicloLectivoActivo.anio}
              sanciones={sanciones}
              config={config}
            />
          )}
        </div>
      </div>
    </Box>
  );
}
