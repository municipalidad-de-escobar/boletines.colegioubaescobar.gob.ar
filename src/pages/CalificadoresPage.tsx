import { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  Box,
  Button,
  Center,
  Group,
  Loader,
  Select,
  Text,
  Title,
  Alert,
  ActionIcon,
  Paper,
} from '@mantine/core';
import { useAuth } from '../contexts/AuthContext';
import {
  getCursos,
  getAlumnosByCurso,
  getCalificacionesByAlumno,
  getMateriasByCurso,
  getConfigInstitucional,
} from '../services/firebase/firestore';
import { calcCol4, calcCol8 } from '../utils/grading';
import type {
  AlumnoFirestore,
  CursoFirestore,
  MateriaFirestore,
  CalificacionFirestore,
  ConfigInstitucional,
} from '../types/firestore';

// ============================================================================
// TYPES
// ============================================================================

type AlumnoDoc = AlumnoFirestore & { id: string };
type MateriaDoc = MateriaFirestore & { id: string };
type CalificacionDoc = CalificacionFirestore & { id: string };

interface CalificadorData {
  alumno: AlumnoDoc;
  materias: MateriaDoc[];
  calificaciones: CalificacionDoc[];
}

// ============================================================================
// CALIFICADOR IMPRIMIBLE — una página por alumno
// ============================================================================

interface CalificadorImprimibleProps {
  data: CalificadorData;
  cursoNombre: string;
  anio: number;
  config: ConfigInstitucional;
}

function CalificadorImprimible({ data, cursoNombre, anio, config }: CalificadorImprimibleProps) {
  const { alumno, materias, calificaciones } = data;

  const getCalByMateria = (materiaId: string) =>
    calificaciones.find((c) => c.materiaRef.id === materiaId);

  const getCol4Display = (cal: CalificacionFirestore | undefined): string => {
    if (!cal) return '';
    const result = calcCol4({ col1: cal.col1, col2: cal.col2, col3: cal.col3 });
    return result.formatted ?? '';
  };

  const getCol8Display = (cal: CalificacionFirestore | undefined): string => {
    if (!cal) return '';
    const col4Result = calcCol4({ col1: cal.col1, col2: cal.col2, col3: cal.col3 });
    const result = calcCol8({
      col4: col4Result.value,
      col3: cal.col3,
      col5: cal.col5,
      col6: cal.col6,
      col7: cal.col7,
    });
    if (result.estado === 'ausente') return 'Aus.';
    return result.value !== null ? String(result.value) : '';
  };

  const getEvalDisplay = (col: { value: number | null; estado: string | null } | undefined): string => {
    if (!col) return '';
    if (col.estado === 'ausente') return 'Aus.';
    return col.value !== null ? String(col.value) : '';
  };

  const cellStyle: React.CSSProperties = {
    border: '1px solid #000',
    padding: '2px 4px',
    textAlign: 'center',
    fontSize: 10,
  };

  const headerCellStyle: React.CSSProperties = {
    ...cellStyle,
    backgroundColor: '#e8e8e8',
    fontWeight: 'bold',
    fontSize: 9,
  };

  return (
    <div style={{
      width: '210mm',
      minHeight: '297mm',
      padding: '10mm 12mm',
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      color: '#000',
      backgroundColor: '#fff',
      boxSizing: 'border-box',
    }}>
      {/* ENCABEZADO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <img src="/logos/logo-blanco.png" alt="Logo Colegio" style={{ height: 80, objectFit: 'contain' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 'bold', fontSize: 12 }}>Colegio Preuniversitario Dr. Ramón A. Cereijo</div>
          <div>UBA — Escobar</div>
          <div style={{ fontWeight: 'bold', marginTop: 4 }}>CALIFICADOR — Año {anio}</div>
        </div>
        <img src="/logos/logo-muni.png" alt="Logo Municipalidad" style={{ height: 80, objectFit: 'contain' }} />
      </div>

      {/* DATOS DEL ALUMNO */}
      <div style={{ border: '1px solid #000', padding: '4px 8px', marginBottom: 8, display: 'flex', gap: 24 }}>
        <div><strong>Alumno/a:</strong> {alumno.lastName}, {alumno.firstName}</div>
        <div><strong>DNI:</strong> {alumno.dni}</div>
        <div><strong>Curso:</strong> {cursoNombre}</div>
        <div><strong>Año lectivo:</strong> {anio}</div>
      </div>

      {/* TABLA DE CALIFICACIONES */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
        <thead>
          <tr>
            <th style={{ ...headerCellStyle, textAlign: 'left', width: '28%' }}>Asignatura</th>
            <th style={headerCellStyle}>1er Trim.</th>
            <th style={headerCellStyle}>2do Trim.</th>
            <th style={headerCellStyle}>3er Trim.</th>
            <th style={{ ...headerCellStyle, backgroundColor: '#d0d0d0' }}>Prom. Anual</th>
            <th style={headerCellStyle}>Dic.</th>
            <th style={headerCellStyle}>Feb/Mar</th>
            <th style={headerCellStyle}>Eval. Adic.</th>
            <th style={{ ...headerCellStyle, backgroundColor: '#d0d0d0' }}>Calif. Final</th>
            <th style={headerCellStyle}>Observaciones</th>
          </tr>
        </thead>
        <tbody>
          {materias.map((materia) => {
            const cal = getCalByMateria(materia.id);
            return (
              <tr key={materia.id}>
                <td style={{ ...cellStyle, textAlign: 'left', fontWeight: 500 }}>{materia.name}</td>
                <td style={cellStyle}>{cal?.col1 ?? ''}</td>
                <td style={cellStyle}>{cal?.col2 ?? ''}</td>
                <td style={cellStyle}>{cal?.col3 ?? ''}</td>
                <td style={{ ...cellStyle, backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>
                  {getCol4Display(cal)}
                </td>
                <td style={cellStyle}>{getEvalDisplay(cal?.col5)}</td>
                <td style={cellStyle}>{getEvalDisplay(cal?.col6)}</td>
                <td style={cellStyle}>{getEvalDisplay(cal?.col7)}</td>
                <td style={{ ...cellStyle, backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>
                  {getCol8Display(cal)}
                </td>
                <td style={cellStyle}></td>
              </tr>
            );
          })}
          {/* Filas vacías para completar a mano si es necesario */}
          {Array.from({ length: Math.max(0, 15 - materias.length) }).map((_, i) => (
            <tr key={`empty-${i}`}>
              <td style={cellStyle}>&nbsp;</td>
              <td style={cellStyle}></td>
              <td style={cellStyle}></td>
              <td style={cellStyle}></td>
              <td style={{ ...cellStyle, backgroundColor: '#f5f5f5' }}></td>
              <td style={cellStyle}></td>
              <td style={cellStyle}></td>
              <td style={cellStyle}></td>
              <td style={{ ...cellStyle, backgroundColor: '#f5f5f5' }}></td>
              <td style={cellStyle}></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* PREVIAS */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <thead>
          <tr>
            <th style={{ ...headerCellStyle, textAlign: 'left' }}>Previas</th>
            <th style={headerCellStyle}>Asignatura</th>
            <th style={headerCellStyle}>Libro</th>
            <th style={headerCellStyle}>Folio</th>
            <th style={headerCellStyle}>Calificación</th>
            <th style={headerCellStyle}>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3].map((i) => (
            <tr key={i}>
              <td style={{ ...cellStyle, textAlign: 'left' }}>{i}</td>
              <td style={cellStyle}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>
              <td style={cellStyle}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>
              <td style={cellStyle}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>
              <td style={cellStyle}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>
              <td style={cellStyle}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* INASISTENCIAS Y PROMEDIO */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ border: '1px solid #000', padding: '4px 8px' }}>
          <strong>Inasistencias totales:</strong> ___________
        </div>
        <div style={{ border: '1px solid #000', padding: '4px 8px' }}>
          <strong>Promedio general:</strong> ___________
        </div>
      </div>

      {/* FIRMAS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 90 }}>
        <div style={{ textAlign: 'center', width: '22%' }}>
          <div style={{ borderTop: '1px solid #000', paddingTop: 4 }}>
            <div>{config.firma1Nombre}</div>
            <div style={{ fontSize: 9 }}>{config.firma1Cargo}</div>
          </div>
        </div>
        <div style={{ textAlign: 'center', width: '22%' }}>
          <div style={{ borderTop: '1px solid #000', paddingTop: 4 }}>
            <div>{config.firma2Nombre}</div>
            <div style={{ fontSize: 9 }}>{config.firma2Cargo}</div>
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
// CALIFICADORES CURSO COMPLETO
// ============================================================================

interface CalificadoresCursoProps {
  calificadores: CalificadorData[];
  cursoNombre: string;
  anio: number;
  config: ConfigInstitucional;
}

function CalificadoresCurso({ calificadores, cursoNombre, anio, config }: CalificadoresCursoProps) {
  return (
    <div>
      {calificadores.map((data, idx) => (
        <div
          key={data.alumno.id}
          style={{ pageBreakAfter: idx < calificadores.length - 1 ? 'always' : 'auto' }}
        >
          <CalificadorImprimible
            data={data}
            cursoNombre={cursoNombre}
            anio={anio}
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

export default function CalificadoresPage() {
  const { cicloLectivoActivo } = useAuth();

  const [cursos, setCursos] = useState<(CursoFirestore & { id: string })[]>([]);
  const [selectedCursoId, setSelectedCursoId] = useState('');
  const [selectedCursoNombre, setSelectedCursoNombre] = useState('');
  const [alumnos, setAlumnos] = useState<AlumnoDoc[]>([]);
  const [selectedAlumnoIdx, setSelectedAlumnoIdx] = useState(0);
  const [calificadores, setCalificadores] = useState<CalificadorData[]>([]);
  const [config, setConfig] = useState<ConfigInstitucional>({
    firma1Nombre: '',
    firma1Cargo: '',
    firma2Nombre: '',
    firma2Cargo: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const printSingleRef = useRef<HTMLDivElement>(null);
  const printAllRef = useRef<HTMLDivElement>(null);

  const handlePrintSingle = useReactToPrint({
    contentRef: printSingleRef,
    documentTitle: `Calificador_${alumnos[selectedAlumnoIdx]?.lastName ?? 'alumno'}`,
  });

  const handlePrintAll = useReactToPrint({
    contentRef: printAllRef,
    documentTitle: `Calificadores_${selectedCursoNombre}_${cicloLectivoActivo?.anio}`,
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
  // LOAD CALIFICADORES
  // ========================================================================

  useEffect(() => {
    if (!selectedCursoId || !cicloLectivoActivo) return;

    const load = async () => {
      setLoading(true);
      setCalificadores([]);
      setSelectedAlumnoIdx(0);
      try {
        const [alumnosData, materiasData] = await Promise.all([
          getAlumnosByCurso(selectedCursoId, cicloLectivoActivo.anio),
          getMateriasByCurso(selectedCursoId),
        ]);

        setAlumnos(alumnosData);

        const calificadoresData: CalificadorData[] = await Promise.all(
          alumnosData.map(async (alumno) => {
            const calificaciones = await getCalificacionesByAlumno(alumno.id, cicloLectivoActivo.anio);
            return {
              alumno,
              materias: materiasData as MateriaDoc[],
              calificaciones: calificaciones as CalificacionDoc[],
            };
          })
        );

        setCalificadores(calificadoresData);
      } catch {
        showMessage('Error al cargar calificadores', 'error');
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

  const calificadorActual = calificadores[selectedAlumnoIdx];

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Title order={2}>Calificadores</Title>
        <Text size="sm" c="dimmed">Ciclo lectivo {cicloLectivoActivo.anio}</Text>
      </Group>

      {message && (
        <Alert color={messageType === 'error' ? 'red' : 'green'} mb="md">
          {message}
        </Alert>
      )}

      <Paper p="md" withBorder mb="md">
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
          style={{ maxWidth: 200 }}
        />
      </Paper>

      {selectedCursoId && (
        loading ? (
          <Center py="xl"><Loader /></Center>
        ) : calificadores.length > 0 ? (
          <>
            {/* NAVEGACIÓN */}
            <Paper p="md" withBorder mb="md">
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
                    ({selectedAlumnoIdx + 1} de {calificadores.length})
                  </Text>
                  <ActionIcon
                    variant="outline"
                    disabled={selectedAlumnoIdx === calificadores.length - 1}
                    onClick={() => setSelectedAlumnoIdx((i) => i + 1)}
                    size="lg"
                  >
                    →
                  </ActionIcon>
                </Group>

                <Group gap="xs">
                  <Button variant="outline" onClick={handlePrintSingle}>
                    Imprimir este calificador
                  </Button>
                  <Button onClick={handlePrintAll}>
                    Imprimir curso completo
                  </Button>
                </Group>
              </Group>
            </Paper>

            {/* VISTA PREVIA */}
            <Box style={{ border: '1px solid #dee2e6', borderRadius: 8, overflow: 'hidden' }}>
              <div ref={printSingleRef}>
                {calificadorActual && (
                  <CalificadorImprimible
                    data={calificadorActual}
                    cursoNombre={selectedCursoNombre}
                    anio={cicloLectivoActivo.anio}
                    config={config}
                  />
                )}
              </div>
            </Box>

            {/* CONTENEDOR OCULTO para imprimir curso completo */}
            <div style={{ display: 'none' }}>
              <div ref={printAllRef}>
                <CalificadoresCurso
                  calificadores={calificadores}
                  cursoNombre={selectedCursoNombre}
                  anio={cicloLectivoActivo.anio}
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