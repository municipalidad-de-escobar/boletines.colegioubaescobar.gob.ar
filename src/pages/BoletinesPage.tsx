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
  Text,
  Title,
  Alert,
  Switch,
  ActionIcon,
  Paper,
} from '@mantine/core';
import { useAuth } from '../contexts/AuthContext';
import {
  getCursos,
  getAlumnosByCurso,
  getCalificacionesByAlumno,
  getMateriasByCurso,
  getInasistenciasByAlumno,
  getSancionesByAlumno,
  getConfigInstitucional,
} from '../services/firebase/firestore';
import { calcCol4, calcCol8 } from '../utils/grading';
import type {
  AlumnoFirestore,
  CursoFirestore,
  MateriaFirestore,
  CalificacionFirestore,
  InasistenciaFirestore,
  SancionFirestore,
  ConfigInstitucional,
} from '../types/firestore';

// ============================================================================
// TYPES
// ============================================================================

type AlumnoDoc = AlumnoFirestore & { id: string };
type MateriaDoc = MateriaFirestore & { id: string };
type CalificacionDoc = CalificacionFirestore & { id: string };
type InasistenciaDoc = InasistenciaFirestore & { id: string };
type SancionDoc = SancionFirestore & { id: string };

interface BoletinData {
  alumno: AlumnoDoc;
  materias: MateriaDoc[];
  calificaciones: CalificacionDoc[];
  inasistencias: InasistenciaDoc[];
  sanciones: SancionDoc[];
}


// ============================================================================
// BOLETIN IMPRIMIBLE
// ============================================================================

interface BoletinImprimibleProps {
  data: BoletinData;
  cursoNombre: string;
  anio: number;
  modoCompleto: boolean;
  config: ConfigInstitucional;
}

function BoletinImprimible({ data, cursoNombre, anio, modoCompleto, config }: BoletinImprimibleProps) {
  const { alumno, materias, calificaciones, inasistencias, sanciones } = data;

  const getCalByMateria = (materiaId: string) =>
    calificaciones.find((c) => c.materiaRef.id === materiaId);

  const getCol4Display = (cal: CalificacionFirestore | undefined): string => {
    if (!cal) return '—';
    const result = calcCol4({ col1: cal.col1, col2: cal.col2, col3: cal.col3 });
    return result.formatted ?? '—';
  };

  const getCol8Display = (cal: CalificacionFirestore | undefined): string => {
    if (!cal) return '—';
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

  const getEvalDisplay = (col: { value: number | null; estado: string | null } | undefined): string => {
    if (!col) return '—';
    if (col.estado === 'ausente') return 'Ausente';
    return col.value !== null ? String(col.value) : '—';
  };

  const t1 = inasistencias.find((i) => i.trimestre === 1);
  const t2 = inasistencias.find((i) => i.trimestre === 2);
  const t3 = inasistencias.find((i) => i.trimestre === 3);

  const sancionesT1 = sanciones
    .filter((s) => { const d = new Date(s.fecha.seconds * 1000); return d >= new Date(`${anio}-03-01`) && d < new Date(`${anio}-06-01`); })
    .reduce((acc, s) => acc + (s.cantidad ?? 1), 0);
  const sancionesT2 = sanciones
    .filter((s) => { const d = new Date(s.fecha.seconds * 1000); return d >= new Date(`${anio}-06-01`) && d < new Date(`${anio}-09-01`); })
    .reduce((acc, s) => acc + (s.cantidad ?? 1), 0);
  const sancionesT3 = sanciones
    .filter((s) => { const d = new Date(s.fecha.seconds * 1000); return d >= new Date(`${anio}-09-01`) && d < new Date(`${anio}-12-01`); })
    .reduce((acc, s) => acc + (s.cantidad ?? 1), 0);

  const asignaturasPrevias = materias.filter((m) => {
    const cal = getCalByMateria(m.id);
    if (!cal) return false;
    const col8 = getCol8Display(cal);
    return col8 !== '—' && (Number(col8) < 4 || col8 === 'Ausente');
  });

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
        <img src="/logos/logo-blanco.png" alt="Logo Colegio" style={{ height: 90, objectFit: 'contain' }} />
        <img src="/logos/logo-muni.png" alt="Logo Municipalidad" style={{ height: 90, objectFit: 'contain' }} />
      </div>

      {/* TÍTULO */}
      <div style={{ border: '1px solid #000', textAlign: 'center', padding: '6px', marginBottom: 8 }}>
        <strong style={{ fontSize: 13 }}>Boletín Trimestral — Año {anio}</strong>
      </div>

      {/* NOMBRE DEL COLEGIO */}
      <div style={{ border: '1px solid #000', borderTop: 'none', textAlign: 'center', padding: '4px', marginBottom: 8 }}>
        <div>Colegio Preuniversitario Dr. Ramón A. Cereijo</div>
        <div>UBA — Escobar</div>
      </div>

      {/* ALUMNO Y CURSO */}
      <div style={{ display: 'flex', border: '1px solid #000', borderTop: 'none', marginBottom: 12 }}>
        <div style={{ flex: 3, padding: '4px 8px', borderRight: '1px solid #000' }}>
          <span style={{ marginRight: 8 }}>Estudiante:</span>
          <strong>{alumno.lastName}, {alumno.firstName}</strong>
        </div>
        <div style={{ flex: 1, padding: '4px 8px' }}>
          <span style={{ marginRight: 8 }}>Curso:</span>
          <strong>{cursoNombre}</strong>
        </div>
      </div>

      {/* TABLA DE NOTAS */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr style={{ backgroundColor: '#f0f0f0' }}>
            <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>Asignaturas</th>
            <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>1er Trimestre</th>
            <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>2do Trimestre</th>
            <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>3er Trimestre</th>
            {modoCompleto && (
              <>
                <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>Promedio</th>
                <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>Dic</th>
                <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>Feb</th>
                <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>Adic</th>
              </>
            )}
            <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>Nota Final</th>
          </tr>
        </thead>
        <tbody>
          {materias.map((materia) => {
            const cal = getCalByMateria(materia.id);
            return (
              <tr key={materia.id}>
                <td style={{ border: '1px solid #000', padding: '3px 6px' }}>{materia.name}</td>
                <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center' }}>{cal?.col1 ?? '—'}</td>
                <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center' }}>{cal?.col2 ?? '—'}</td>
                <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center' }}>{cal?.col3 ?? '—'}</td>
                {modoCompleto && (
                  <>
                    <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center' }}>{getCol4Display(cal)}</td>
                    <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center' }}>{getEvalDisplay(cal?.col5)}</td>
                    <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center' }}>{getEvalDisplay(cal?.col6)}</td>
                    <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center' }}>{getEvalDisplay(cal?.col7)}</td>
                  </>
                )}
                <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center', fontWeight: 'bold' }}>{getCol8Display(cal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ASIGNATURA PREVIA */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #000', padding: '4px 8px', fontWeight: 'bold', width: '40%' }}>
              ASIGNATURA PREVIA
            </td>
            <td style={{ border: '1px solid #000', padding: '4px 8px' }}>
              {asignaturasPrevias.map((m) => m.name).join(', ') || '—'}
            </td>
          </tr>
        </tbody>
      </table>

      {/* INASISTENCIAS Y SANCIONES */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead>
          <tr style={{ backgroundColor: '#f0f0f0' }}>
            <th style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'left' }}></th>
            <th style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center' }}>1er Trimestre</th>
            <th style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center' }}>2do Trimestre</th>
            <th style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center' }}>3er Trimestre</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #000', padding: '4px 8px', fontWeight: 'bold' }}>INASISTENCIAS</td>
            <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center' }}>{(t1?.cantidad ?? 0) || '—'}</td>
            <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center' }}>{(t2?.cantidad ?? 0) || '—'}</td>
            <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center' }}>{(t3?.cantidad ?? 0) || '—'}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #000', padding: '4px 8px', fontWeight: 'bold' }}>SANCIONES</td>
            <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center' }}>{sancionesT1 || '—'}</td>
            <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center' }}>{sancionesT2 || '—'}</td>
            <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center' }}>{sancionesT3 || '—'}</td>
          </tr>
        </tbody>
      </table>

      {/* FIRMAS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 90 }}>
        <div style={{ textAlign: 'center', width: '22%' }}>
          <div style={{ borderTop: '1px solid #000', paddingTop: 4 }}>
            <div>{config.firma1Nombre}</div>
            <div>{config.firma1Cargo}</div>
          </div>
        </div>
        <div style={{ textAlign: 'center', width: '22%' }}>
          <div style={{ borderTop: '1px solid #000', paddingTop: 4 }}>
            <div>{config.firma2Nombre}</div>
            <div>{config.firma2Cargo}</div>
          </div>
        </div>
        <div style={{ textAlign: 'center', width: '22%' }}>
          <div style={{ borderTop: '1px solid #000', paddingTop: 4 }}>
            <div>Estudiante</div>
          </div>
        </div>
        <div style={{ textAlign: 'center', width: '22%' }}>
          <div style={{ borderTop: '1px solid #000', paddingTop: 4 }}>
            <div>Madre/Padre/Tutor(a)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// BOLETIN CURSO COMPLETO (para imprimir todos juntos)
// ============================================================================

interface BoletinesCursoProps {
  boletines: BoletinData[];
  cursoNombre: string;
  anio: number;
  modoCompleto: boolean;
  config: ConfigInstitucional;
}

function BoletinesCurso({ boletines, cursoNombre, anio, modoCompleto, config }: BoletinesCursoProps) {
  return (
    <div>
      {boletines.map((data, idx) => (
        <div
          key={data.alumno.id}
          style={{ pageBreakAfter: idx < boletines.length - 1 ? 'always' : 'auto' }}
        >
          <BoletinImprimible
            data={data}
            cursoNombre={cursoNombre}
            anio={anio}
            modoCompleto={modoCompleto}
            config={config}
          />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function BoletinesPage() {
  const { cicloLectivoActivo } = useAuth();

  const [cursos, setCursos] = useState<(CursoFirestore & { id: string })[]>([]);
  const [selectedCursoId, setSelectedCursoId] = useState('');
  const [selectedCursoNombre, setSelectedCursoNombre] = useState('');
  const [alumnos, setAlumnos] = useState<AlumnoDoc[]>([]);
  const [selectedAlumnoIdx, setSelectedAlumnoIdx] = useState(0);
  const [boletines, setBoletines] = useState<BoletinData[]>([]);
  const [config, setConfig] = useState<ConfigInstitucional>({
    firma1Nombre: '',
    firma1Cargo: '',
    firma2Nombre: '',
    firma2Cargo: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [modoCompleto, setModoCompleto] = useState(false);

  // Refs para impresión
  const printSingleRef = useRef<HTMLDivElement>(null);
  const printAllRef = useRef<HTMLDivElement>(null);

  const handlePrintSingle = useReactToPrint({
    contentRef: printSingleRef,
    documentTitle: `Boletin_${alumnos[selectedAlumnoIdx]?.lastName ?? 'alumno'}`,
  });

  const handlePrintAll = useReactToPrint({
    contentRef: printAllRef,
    documentTitle: `Boletines_${selectedCursoNombre}_${cicloLectivoActivo?.anio}`,
  });

  const showMessage = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(null), 5000);
  };

  // ========================================================================
  // LOAD CURSOS Y CONFIG
  // ========================================================================

  useEffect(() => {
    const load = async () => {
      try {
        const [cursosData, configData] = await Promise.all([
          getCursos(),
          getConfigInstitucional(),
        ]);
        setCursos(cursosData);
        if (configData) {
          setConfig(configData);
        }
      } catch {
        showMessage('Error al cargar datos', 'error');
      }
    };
    load();
  }, []);

  // ========================================================================
  // LOAD BOLETINES DEL CURSO
  // ========================================================================

  useEffect(() => {
    if (!selectedCursoId || !cicloLectivoActivo) return;

    const load = async () => {
      setLoading(true);
      setBoletines([]);
      setSelectedAlumnoIdx(0);
      try {
        const [alumnosData, materiasData] = await Promise.all([
          getAlumnosByCurso(selectedCursoId, cicloLectivoActivo.anio),
          getMateriasByCurso(selectedCursoId),
        ]);

        setAlumnos(alumnosData);

        const boletinesData: BoletinData[] = await Promise.all(
          alumnosData.map(async (alumno) => {
            const [calificaciones, inasistencias, sanciones] = await Promise.all([
              getCalificacionesByAlumno(alumno.id, cicloLectivoActivo.anio),
              getInasistenciasByAlumno(alumno.id, cicloLectivoActivo.anio),
              getSancionesByAlumno(alumno.id, cicloLectivoActivo.anio),
            ]);
            return {
              alumno,
              materias: materiasData as MateriaDoc[],
              calificaciones: calificaciones as CalificacionDoc[],
              inasistencias: inasistencias as InasistenciaDoc[],
              sanciones: sanciones as SancionDoc[],
            };
          })
        );

        setBoletines(boletinesData);
      } catch {
        showMessage('Error al cargar boletines', 'error');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [selectedCursoId, cicloLectivoActivo]);

  // ========================================================================
  // RENDER
  // ========================================================================

  if (!cicloLectivoActivo) {
    return <Center py="xl"><Loader /></Center>;
  }

  const alumnoActual = boletines[selectedAlumnoIdx];

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Title order={2}>Boletines</Title>
        <Text size="sm" c="dimmed">Ciclo lectivo {cicloLectivoActivo.anio}</Text>
      </Group>

      {message && (
        <Alert color={messageType === 'error' ? 'red' : 'green'} mb="md">
          {message}
        </Alert>
      )}

      {/* CONTROLES */}
      <Paper p="md" withBorder mb="md">
        <Group align="flex-end" gap="md" wrap="wrap">
          <Select
            label="Curso"
            data={cursos.map((c) => ({ value: c.id, label: c.name }))}
            value={selectedCursoId}
            onChange={(v) => {
              setSelectedCursoId(v ?? '');
              setSelectedCursoNombre(cursos.find((c) => c.id === v)?.name ?? '');
            }}
            placeholder="Seleccione un curso"
            searchable
            style={{ minWidth: 150 }}
          />

          <Switch
            label="Modo completo (incluir Promedio, Dic, Feb, Adic)"
            checked={modoCompleto}
            onChange={(e) => setModoCompleto(e.currentTarget.checked)}
          />
        </Group>
      </Paper>

      {selectedCursoId && (
        loading ? (
          <Center py="xl"><Loader /></Center>
        ) : boletines.length > 0 ? (
          <>
            {/* NAVEGACIÓN */}
            <Paper p="md" withBorder mb="md">
              <Stack gap="sm">
                <Group justify="space-between" align="center">
                  <Group gap="xs">
                    <ActionIcon
                      variant="outline"
                      disabled={selectedAlumnoIdx === 0}
                      onClick={() => setSelectedAlumnoIdx((i) => i - 1)}
                      size="lg"
                    >
                      ←
                    </ActionIcon>
                    <Text fw={600}>
                      {alumnos[selectedAlumnoIdx]?.lastName}, {alumnos[selectedAlumnoIdx]?.firstName}
                    </Text>
                    <Text c="dimmed" size="sm">
                      ({selectedAlumnoIdx + 1} de {boletines.length})
                    </Text>
                    <ActionIcon
                      variant="outline"
                      disabled={selectedAlumnoIdx === boletines.length - 1}
                      onClick={() => setSelectedAlumnoIdx((i) => i + 1)}
                      size="lg"
                    >
                      →
                    </ActionIcon>
                  </Group>

                  <Group gap="xs">
                    <Button variant="outline" onClick={handlePrintSingle}>
                      Imprimir este boletín
                    </Button>
                    <Button onClick={handlePrintAll}>
                      Imprimir curso completo
                    </Button>
                  </Group>
                </Group>

                <Select
                  placeholder="Buscar alumno por nombre..."
                  data={alumnos.map((a, i) => ({ value: String(i), label: `${a.lastName}, ${a.firstName}` }))}
                  value={String(selectedAlumnoIdx)}
                  onChange={(v) => v !== null && setSelectedAlumnoIdx(Number(v))}
                  searchable
                  style={{ maxWidth: 320 }}
                />
              </Stack>
            </Paper>

            {/* VISTA PREVIA — alumno actual */}
            <Box style={{ border: '1px solid #dee2e6', borderRadius: 8, overflow: 'hidden' }}>
              <div ref={printSingleRef}>
                {alumnoActual && (
                  <BoletinImprimible
                    data={alumnoActual}
                    cursoNombre={selectedCursoNombre}
                    anio={cicloLectivoActivo.anio}
                    modoCompleto={modoCompleto}
                    config={config}
                  />
                )}
              </div>
            </Box>

            {/* CONTENEDOR OCULTO para imprimir curso completo */}
            <div style={{ display: 'none' }}>
              <div ref={printAllRef}>
                <BoletinesCurso
                  boletines={boletines}
                  cursoNombre={selectedCursoNombre}
                  anio={cicloLectivoActivo.anio}
                  modoCompleto={modoCompleto}
                  config={config}
                />
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