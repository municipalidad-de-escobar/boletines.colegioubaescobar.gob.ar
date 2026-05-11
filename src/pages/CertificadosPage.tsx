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
  Paper,
  ActionIcon,
} from '@mantine/core';
import { useAuth } from '../contexts/AuthContext';
import {
  getCursos,
  getAlumnosByCurso,
  getCalificacionesByAlumno,
  getMateriasByCurso,
} from '../services/firebase/firestore';
import { calcCol4, calcCol8 } from '../utils/grading';
import type {
  AlumnoFirestore,
  CursoFirestore,
  MateriaFirestore,
  CalificacionFirestore,
} from '../types/firestore';

// ============================================================================
// TYPES
// ============================================================================

type AlumnoDoc = AlumnoFirestore & { id: string };
type MateriaDoc = MateriaFirestore & { id: string };
type CalificacionDoc = CalificacionFirestore & { id: string };

interface AnioData {
  anioLectivo: number;
  grado: number;
  division: string;
  cursoNombre: string;
  materias: MateriaDoc[];
  calificaciones: CalificacionDoc[];
}

interface AnaliticoData {
  alumno: AlumnoDoc;
  anios: AnioData[];
}

const NOMBRE_ANIO = ['', 'PRIMER', 'SEGUNDO', 'TERCER', 'CUARTO', 'QUINTO', 'SEXTO'];
const ESTABLECIMIENTO_PROPIO = 'En este Establecimiento';

// ============================================================================
// HELPERS
// ============================================================================

function getCol8Display(cal: CalificacionFirestore | undefined): string {
  if (!cal) return '';
  const col4Result = calcCol4({ col1: cal.col1, col2: cal.col2, col3: cal.col3 });
  const result = calcCol8({
    col4: col4Result.value,
    col3: cal.col3,
    col5: cal.col5,
    col6: cal.col6,
    col7: cal.col7,
  });
  if (result.estado === 'ausente') return 'Ausente';
  if (cal.notaFinalManual != null) return String(cal.notaFinalManual);
  return result.value !== null ? String(result.value) : '';
}

function getPromedioAnio(materias: MateriaDoc[], calificaciones: CalificacionDoc[]): string {
  const notas: number[] = [];
  for (const materia of materias) {
    const cal = calificaciones.find((c) => c.materiaRef.id === materia.id);
    const display = getCol8Display(cal);
    const num = parseFloat(display);
    if (!isNaN(num)) notas.push(num);
  }
  if (notas.length === 0) return '';
  const promedio = notas.reduce((a, b) => a + b, 0) / notas.length;
  return promedio.toFixed(2);
}

function getMesAnio(
  cal: CalificacionFirestore | undefined,
  anioLectivo: number
): { mes: string; anio: string } {
  if (!cal) return { mes: '', anio: '' };
  if (cal.fechaRendicionPrevia) {
    const fecha = new Date(cal.fechaRendicionPrevia.seconds * 1000);
    const meses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    return { mes: meses[fecha.getMonth()], anio: String(fecha.getFullYear()) };
  }
  return { mes: 'NOV', anio: String(anioLectivo) };
}

// ============================================================================
// ANALITICO IMPRIMIBLE
// ============================================================================

interface AnaliticoImprimibleProps {
  data: AnaliticoData;
}

function AnaliticoImprimible({ data }: AnaliticoImprimibleProps) {
  const { alumno, anios } = data;

  const fechaNacimiento = alumno.fechaNacimiento
    ? new Date(alumno.fechaNacimiento.seconds * 1000).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  const cellStyle: React.CSSProperties = {
    border: '1px solid #000',
    padding: '2px 5px',
    fontSize: 8,
  };

  const headerCellStyle: React.CSSProperties = {
    ...cellStyle,
    backgroundColor: '#e0e0e0',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 8,
  };

  const cicloBasicoAnios = anios.filter((a) => a.grado <= 3);
  const cicloOrientadoAnios = anios.filter((a) => a.grado >= 4);

  const renderAnio = (anioData: AnioData) => {
    const promedio = getPromedioAnio(anioData.materias, anioData.calificaciones);
    return (
      <div key={`${anioData.anioLectivo}-${anioData.grado}`} style={{ marginBottom: 6 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...headerCellStyle, width: '10%' }}>CONDICIÓN</th>
              <th style={{ ...headerCellStyle, width: '6%' }}>MES</th>
              <th style={{ ...headerCellStyle, width: '6%' }}>AÑO</th>
              <th style={{ ...headerCellStyle, textAlign: 'left', width: '42%' }}>MATERIA</th>
              <th style={{ ...headerCellStyle, width: '12%' }}>CALIFICACIÓN</th>
              <th style={{ ...headerCellStyle, width: '24%' }}>ESTABLECIMIENTO</th>
            </tr>
          </thead>
          <tbody>
            {anioData.materias.map((materia) => {
              const cal = anioData.calificaciones.find((c) => c.materiaRef.id === materia.id);
              const col8 = getCol8Display(cal);
              const { mes, anio } = getMesAnio(cal, anioData.anioLectivo);
              const condicion = cal?.condicion ?? 'REGULAR';
              const establecimiento = cal?.establecimiento || ESTABLECIMIENTO_PROPIO;
              return (
                <tr key={materia.id}>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>{col8 ? condicion : ''}</td>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>{col8 ? mes : ''}</td>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>{col8 ? anio : ''}</td>
                  <td style={cellStyle}>{materia.name}</td>
                  <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold' }}>{col8}</td>
                  <td style={{ ...cellStyle, textAlign: 'center', fontSize: 7 }}>
                    {col8 ? establecimiento : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* RESUMEN DEL AÑO */}
        <div style={{
          border: '1px solid #000',
          borderTop: 'none',
          padding: '3px 8px',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 8,
          fontWeight: 'bold',
          backgroundColor: '#f5f5f5',
        }}>
          <span>{NOMBRE_ANIO[anioData.grado]} AÑO — CURSO: COMPLETO</span>
          <span>PROMEDIO: {promedio || '—'}</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      width: '210mm',
      minHeight: '297mm',
      padding: '10mm 12mm',
      fontFamily: 'Arial, sans-serif',
      fontSize: '9px',
      color: '#000',
      backgroundColor: '#fff',
      boxSizing: 'border-box',
    }}>
      {/* ENCABEZADO LEGAL */}
      <div style={{ textAlign: 'center', marginBottom: 6, fontSize: 7, lineHeight: 1.4 }}>
        <div>LEY DE EDUCACIÓN NACIONAL N° 26.206 — PROVINCIA DE BUENOS AIRES — LEY DE EDUCACIÓN PROVINCIAL N° 13.688</div>
        <div>DIRECCIÓN GENERAL DE CULTURA Y EDUCACIÓN — DIRECCIÓN DE EDUCACIÓN DE GESTIÓN PRIVADA</div>
      </div>

      {/* LOGO */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
        <img src="/logos/logo-blanco.png" alt="Logo Colegio" style={{ height: 80, objectFit: 'contain' }} />
      </div>

      {/* TEXTO CERTIFICACIÓN */}
      <div style={{ marginBottom: 8, lineHeight: 1.6, fontSize: 8 }}>
        La Dirección del establecimiento educativo{' '}
        <strong>Colegio Preuniversitario Dr. Ramón A. Cereijo UBA DIEGEP 8566</strong> de Escobar,
        C.U.E. N° 62396000, ubicado en Cervantes 635 de la ciudad de Escobar, certifica que:
      </div>

      {/* DATOS DEL ALUMNO */}
      <div style={{
        border: '1px solid #000',
        padding: '5px 8px',
        marginBottom: 8,
        lineHeight: 1.8,
        fontSize: 9,
      }}>
        <strong>{alumno.lastName}, {alumno.firstName}</strong>
        {alumno.fechaNacimiento && (
          <span> — nacido/a el <strong>{fechaNacimiento}</strong></span>
        )}
        {' '}— D.N.I. N° <strong>{alumno.dni}</strong>
        <div style={{ fontSize: 8, marginTop: 2 }}>
          acreditó las materias que con sus respectivas calificaciones a continuación se expresan:
        </div>
      </div>

      {/* NIVEL */}
      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 10, marginBottom: 6 }}>
        NIVEL DE EDUCACIÓN SECUNDARIA
      </div>

      {/* CICLO BÁSICO */}
      {cicloBasicoAnios.length > 0 && (
        <>
          <div style={{ fontWeight: 'bold', textAlign: 'center', fontSize: 9, marginBottom: 4 }}>
            CICLO BÁSICO
          </div>
          {cicloBasicoAnios.map(renderAnio)}
        </>
      )}

      {/* CICLO ORIENTADO */}
      {cicloOrientadoAnios.length > 0 && (
        <>
          <div style={{ fontWeight: 'bold', textAlign: 'center', fontSize: 9, marginBottom: 4, marginTop: 6 }}>
            CICLO ORIENTADO
          </div>
          {cicloOrientadoAnios.map(renderAnio)}
        </>
      )}

      {/* FIRMAS */}
      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 90 }}>
        <div style={{ textAlign: 'center', width: '30%' }}>
          <div style={{ borderTop: '1px solid #000', paddingTop: 4, fontSize: 8 }}>
            <div>Firma y sello del Director/a</div>
          </div>
        </div>
        <div style={{ textAlign: 'center', width: '30%' }}>
          <div style={{ borderTop: '1px solid #000', paddingTop: 4, fontSize: 8 }}>
            <div>Firma y sello del Secretario/a</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ANALITICOS MULTIPLE (para imprimir varios juntos)
// ============================================================================

interface AnaliticosCursoProps {
  analiticos: AnaliticoData[];
}

function AnaliticosCurso({ analiticos }: AnaliticosCursoProps) {
  return (
    <div>
      {analiticos.map((data, idx) => (
        <div
          key={data.alumno.id}
          style={{ pageBreakAfter: idx < analiticos.length - 1 ? 'always' : 'auto' }}
        >
          <AnaliticoImprimible data={data} />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function CertificadosPage() {
  const { cicloLectivoActivo } = useAuth();

  const [cursos, setCursos] = useState<(CursoFirestore & { id: string })[]>([]);
  const [selectedCursoId, setSelectedCursoId] = useState('');
  const [selectedAnioLectivo, setSelectedAnioLectivo] = useState('');
  const [alumnos, setAlumnos] = useState<AlumnoDoc[]>([]);
  const [selectedAlumnoIdx, setSelectedAlumnoIdx] = useState(0);
  const [analiticos, setAnaliticos] = useState<AnaliticoData[]>([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const printSingleRef = useRef<HTMLDivElement>(null);
  const printAllRef = useRef<HTMLDivElement>(null);

  const handlePrintSingle = useReactToPrint({
    contentRef: printSingleRef,
    documentTitle: `Analitico_${alumnos[selectedAlumnoIdx]?.lastName ?? 'alumno'}`,
  });

  const handlePrintAll = useReactToPrint({
    contentRef: printAllRef,
    documentTitle: `Analiticos_${selectedCursoId}_${selectedAnioLectivo}`,
  });

  const showMessage = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(null), 5000);
  };

  // Años lectivos disponibles — desde 2026 hasta el actual
  const anioActual = cicloLectivoActivo?.anio ?? new Date().getFullYear();
  const aniosDisponibles = Array.from(
    { length: anioActual - 2025 },
    (_, i) => {
      const anio = String(2026 + i);
      return { value: anio, label: anio };
    }
  );

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
  // LOAD ANALITICOS
  // ========================================================================

  useEffect(() => {
    if (!selectedCursoId || !selectedAnioLectivo) return;

    const load = async () => {
      setLoading(true);
      setAnaliticos([]);
      setSelectedAlumnoIdx(0);

      try {
        const anioNum = parseInt(selectedAnioLectivo);
        const cursoSeleccionado = cursos.find((c) => c.id === selectedCursoId);
        const grado = cursoSeleccionado?.year ?? 1;
        const division = cursoSeleccionado?.division ?? 'A';

        // Cargar alumnos del curso en ese año
        const alumnosData = await getAlumnosByCurso(selectedCursoId, anioNum);
        setAlumnos(alumnosData);

        // Para cada alumno, construir su analítico con historial de todos los años
        const analiticosData: AnaliticoData[] = await Promise.all(
          alumnosData.map(async (alumno) => {
            const aniosData: AnioData[] = [];

            // Cargar datos de cada año desde 2026 hasta el año seleccionado
            for (let g = 1; g <= grado; g++) {
              const anioLectivoG = anioNum - (grado - g);
              try {
                // Buscar el curso del alumno en ese año lectivo
                // Por simplicidad usamos el mismo curso con el grado correspondiente
                // En producción esto vendría del historialCursos
                const materiasG = await getMateriasByCurso(selectedCursoId);
                const calsG = await getCalificacionesByAlumno(alumno.id, anioLectivoG);

                aniosData.push({
                  anioLectivo: anioLectivoG,
                  grado: g,
                  division,
                  cursoNombre: `${g}°${division}`,
                  materias: materiasG as MateriaDoc[],
                  calificaciones: calsG as CalificacionDoc[],
                });
              } catch {
                // Si no hay datos para ese año, lo saltamos
              }
            }

            return { alumno, anios: aniosData };
          })
        );

        setAnaliticos(analiticosData);
      } catch {
        showMessage('Error al cargar certificados analíticos', 'error');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [selectedCursoId, selectedAnioLectivo, cursos]);

  // ========================================================================
  // RENDER
  // ========================================================================

  if (!cicloLectivoActivo) {
    return <Center py="xl"><Loader /></Center>;
  }

  const analiticoActual = analiticos[selectedAlumnoIdx];

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Title order={2}>Certificados Analíticos</Title>
        <Text size="sm" c="dimmed">Ciclo lectivo {cicloLectivoActivo.anio}</Text>
      </Group>

      {message && (
        <Alert color={messageType === 'error' ? 'red' : 'green'} mb="md">
          {message}
        </Alert>
      )}

      <Paper p="md" withBorder mb="md">
        <Group gap="md" align="flex-end">
          <Select
            label="Año lectivo"
            data={aniosDisponibles}
            value={selectedAnioLectivo}
            onChange={(v) => setSelectedAnioLectivo(v ?? '')}
            placeholder="Seleccione año"
            style={{ minWidth: 130 }}
          />
          <Select
            label="Curso"
            data={cursos.map((c) => ({ value: c.id, label: c.name }))}
            value={selectedCursoId}
            onChange={(v) => setSelectedCursoId(v ?? '')}
            placeholder="Seleccione un curso"
            searchable
            style={{ minWidth: 150 }}
          />
        </Group>
      </Paper>

      {selectedCursoId && selectedAnioLectivo && (
        loading ? (
          <Center py="xl"><Loader /></Center>
        ) : analiticos.length > 0 ? (
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
                    ({selectedAlumnoIdx + 1} de {analiticos.length})
                  </Text>
                  <ActionIcon
                    variant="outline"
                    disabled={selectedAlumnoIdx === analiticos.length - 1}
                    onClick={() => setSelectedAlumnoIdx((i) => i + 1)}
                    size="lg"
                  >
                    →
                  </ActionIcon>
                </Group>

                <Group gap="xs">
                  <Button variant="outline" onClick={handlePrintSingle}>
                    Imprimir este analítico
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
                {analiticoActual && <AnaliticoImprimible data={analiticoActual} />}
              </div>
            </Box>

            {/* CONTENEDOR OCULTO para imprimir todos */}
            <div style={{ display: 'none' }}>
              <div ref={printAllRef}>
                <AnaliticosCurso analiticos={analiticos} />
              </div>
            </div>
          </>
        ) : (
          <Center py="xl">
            <Text c="dimmed">No hay alumnos en este curso para el año seleccionado</Text>
          </Center>
        )
      )}
    </Box>
  );
}