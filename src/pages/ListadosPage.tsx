import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Center,
  FileInput,
  Group,
  Loader,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import Papa from 'papaparse';
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '../services/firebase/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import {
  addAlumno,
  addAsignacion,
  addMateria,
  cerrarAsignacion,
  deleteMateria,
  getAllUsers,
  getAlumnosByCurso,
  getAsignacionesByProfesor,
  getCursos,
  transferirAlumno,
  updateAlumno,
  updateMateria,
} from '../services/firebase/firestore';
import type {
  AlumnoFirestore,
  AsignacionFirestore,
  CursoFirestore,
  MateriaFirestore,
  UserFirestore,
} from '../types/firestore';

type CursoOption = CursoFirestore & { id: string };
type MateriaDoc = MateriaFirestore & { id: string };
type AlumnoDoc = AlumnoFirestore & { id: string };
type ProfesorDoc = UserFirestore & { id: string };
type AsignacionDoc = AsignacionFirestore & { id: string };

type MessageType = 'success' | 'error';

const divisions = ['A', 'B', 'C', 'D'] as const;

const parseCsv = (file: File): Promise<Record<string, string>[]> =>
  new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        if (results.errors.length > 0) {
          reject(results.errors[0]);
          return;
        }
        resolve(results.data);
      },
      error: (error: any) => reject(error),
    });
  });

const formatCourseName = (year: number, division: string) => `${year}°${division}`;

export default function ListadosPage() {
  const { cicloLectivoActivo } = useAuth();
  const cicloLectivo = cicloLectivoActivo?.anio ?? new Date().getFullYear();

  const [tab, setTab] = useState('cursos');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('success');

  const [cursos, setCursos] = useState<CursoOption[]>([]);
  const [cursosLoading, setCursosLoading] = useState(false);

  const [selectedCursoIdMaterias, setSelectedCursoIdMaterias] = useState('');
  const [materias, setMaterias] = useState<MateriaDoc[]>([]);
  const [materiasLoading, setMateriasLoading] = useState(false);
  const [materiasImportModal, setMateriasImportModal] = useState(false);
  const [materiasImportFile, setMateriasImportFile] = useState<File | null>(null);
  const [materiaEditModal, setMateriaEditModal] = useState(false);
  const [materiaCreateModal, setMateriaCreateModal] = useState(false);
  const [materiaEdit, setMateriaEdit] = useState<MateriaDoc | null>(null);
  const [materiaName, setMateriaName] = useState('');
  const [materiaOrden, setMateriaOrden] = useState('');

  const [selectedCursoIdAlumnos, setSelectedCursoIdAlumnos] = useState('');
  const [alumnos, setAlumnos] = useState<AlumnoDoc[]>([]);
  const [alumnosLoading, setAlumnosLoading] = useState(false);
  const [alumnosImportModal, setAlumnosImportModal] = useState(false);
  const [alumnosImportFile, setAlumnosImportFile] = useState<File | null>(null);
  const [alumnoAddModal, setAlumnoAddModal] = useState(false);
  const [profesorAddModal, setProfesorAddModal] = useState(false);
  const [profesorAddFirstName, setProfesorAddFirstName] = useState('');
  const [profesorAddLastName, setProfesorAddLastName] = useState('');
  const [profesorAddEmail, setProfesorAddEmail] = useState('');
  const [alumnoEditModal, setAlumnoEditModal] = useState(false);
  const [alumnoEdit, setAlumnoEdit] = useState<AlumnoDoc | null>(null);
  const [alumnoFirstName, setAlumnoFirstName] = useState('');
  const [alumnoLastName, setAlumnoLastName] = useState('');
  const [alumnoDni, setAlumnoDni] = useState('');
  const [alumnoEmail, setAlumnoEmail] = useState('');
  const [alumnoFechaNacimiento, setAlumnoFechaNacimiento] = useState('');
  const [transferModal, setTransferModal] = useState(false);
  const [transferAlumno, setTransferAlumno] = useState<AlumnoDoc | null>(null);
  const [transferTargetCursoId, setTransferTargetCursoId] = useState('');

  const [profesores, setProfesores] = useState<ProfesorDoc[]>([]);
  const [profesoresLoading, setProfesoresLoading] = useState(false);
  const [profesoresImportModal, setProfesoresImportModal] = useState(false);
  const [profesoresImportFile, setProfesoresImportFile] = useState<File | null>(null);
  const [profesorAssignmentsCount, setProfesorAssignmentsCount] = useState<Record<string, number>>({});
  const [selectedProfesorId, setSelectedProfesorId] = useState('');
  const [asignaciones, setAsignaciones] = useState<AsignacionDoc[]>([]);
  const [asignacionesLoading, setAsignacionesLoading] = useState(false);
  const [assignmentModal, setAssignmentModal] = useState(false);
  const [assignmentCourseId, setAssignmentCourseId] = useState('');
  const [assignmentMaterias, setAssignmentMaterias] = useState<MateriaDoc[]>([]);
  const [assignmentMateriaId, setAssignmentMateriaId] = useState('');

  const cursoOptions = useMemo(
    () => cursos.map((curso) => ({ value: curso.id, label: curso.name })),
    [cursos]
  );

  const profesorOptions = useMemo(
    () => profesores.map((prof) => ({ value: prof.id, label: `${prof.lastName}, ${prof.firstName}` })),
    [profesores]
  );

  const loadCursos = async () => {
    setCursosLoading(true);
    try {
      const cursosSnapshot = await getDocs(
        query(collection(db, 'cursos'), where('active', '==', true), orderBy('year', 'asc'), orderBy('division', 'asc'))
      );
      const cursosWithId = cursosSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as CursoFirestore),
      }));
      setCursos(cursosWithId);
      if (!selectedCursoIdMaterias && cursosWithId.length > 0) {
        setSelectedCursoIdMaterias(cursosWithId[0].id);
      }
      if (!selectedCursoIdAlumnos && cursosWithId.length > 0) {
        setSelectedCursoIdAlumnos(cursosWithId[0].id);
      }
      if (!assignmentCourseId && cursosWithId.length > 0) {
        setAssignmentCourseId(cursosWithId[0].id);
      }
    } catch (error) {
      setMessage('Error al cargar cursos');
      setMessageType('error');
    } finally {
      setCursosLoading(false);
    }
  };

  const loadMaterias = async (cursoId: string) => {
    setMateriasLoading(true);
    try {
      const materiasSnapshot = await getDocs(
        query(collection(db, 'cursos', cursoId, 'materias'), where('active', '==', true), orderBy('orden', 'asc'))
      );
      setMaterias(
        materiasSnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as MateriaFirestore),
        }))
      );
    } catch (error) {
      setMessage('Error al cargar materias');
      setMessageType('error');
    } finally {
      setMateriasLoading(false);
    }
  };

  const loadAlumnos = async (cursoId: string) => {
    setAlumnosLoading(true);
    try {
      const alumnosData = await getAlumnosByCurso(cursoId, cicloLectivo);
      setAlumnos(alumnosData);
    } catch (error) {
      setMessage('Error al cargar alumnos');
      setMessageType('error');
    } finally {
      setAlumnosLoading(false);
    }
  };

  const loadProfesores = async () => {
    setProfesoresLoading(true);
    try {
      const users = await getAllUsers();
      const profs = users.filter((user) => user.role === 'profesor');
      setProfesores(profs);
      if (!selectedProfesorId && profs.length > 0) {
        setSelectedProfesorId(profs[0].id);
      }
      const counts: Record<string, number> = {};
      await Promise.all(
        profs.map(async (prof) => {
          const asignaciones = await getAsignacionesByProfesor(prof.id, cicloLectivo);
          counts[prof.id] = asignaciones.length;
        })
      );
      setProfesorAssignmentsCount(counts);
    } catch (error) {
      setMessage('Error al cargar profesores');
      setMessageType('error');
    } finally {
      setProfesoresLoading(false);
    }
  };

  const loadAsignacionesForProfesor = async (profesorId: string) => {
    setAsignacionesLoading(true);
    try {
      const asignacionesData = await getAsignacionesByProfesor(profesorId, cicloLectivo);
      setAsignaciones(asignacionesData);
    } catch (error) {
      setMessage('Error al cargar asignaciones');
      setMessageType('error');
    } finally {
      setAsignacionesLoading(false);
    }
  };

  const loadAssignmentMaterias = async (cursoId: string) => {
    try {
      const materiasSnapshot = await getDocs(
        query(collection(db, 'cursos', cursoId, 'materias'), where('active', '==', true), orderBy('orden', 'asc'))
      );
      setAssignmentMaterias(
        materiasSnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as MateriaFirestore),
        }))
      );
    } catch (error) {
      setAssignmentMaterias([]);
    }
  };

  useEffect(() => {
    loadCursos();
    loadProfesores();
  }, []);

  useEffect(() => {
    if (selectedCursoIdMaterias) {
      loadMaterias(selectedCursoIdMaterias);
    }
  }, [selectedCursoIdMaterias]);

  useEffect(() => {
    if (selectedCursoIdAlumnos) {
      loadAlumnos(selectedCursoIdAlumnos);
    }
  }, [selectedCursoIdAlumnos, cicloLectivo]);

  useEffect(() => {
    if (assignmentCourseId) {
      loadAssignmentMaterias(assignmentCourseId);
    }
  }, [assignmentCourseId]);

  useEffect(() => {
    if (selectedProfesorId) {
      loadAsignacionesForProfesor(selectedProfesorId);
    }
  }, [selectedProfesorId, cicloLectivo]);

  const showMessage = (text: string, type: MessageType = 'success') => {
    setMessage(text);
    setMessageType(type);
    window.setTimeout(() => {
      setMessage('');
    }, 5000);
  };

  const initializeCursos = async () => {
    setCursosLoading(true);
    try {
      const existingCursos = await getCursos();
      const existingNames = new Set(existingCursos.map((curso) => curso.name));
      const missingCursos: CursoFirestore[] = [];

      for (let year = 1; year <= 6; year += 1) {
        divisions.forEach((division) => {
          const name = formatCourseName(year, division);
          if (!existingNames.has(name)) {
            missingCursos.push({ year: year as 1 | 2 | 3 | 4 | 5 | 6, division, name, active: true });
          }
        });
      }

      if (missingCursos.length === 0) {
        showMessage('Los cursos ya están inicializados', 'success');
        return;
      }

      await Promise.all(
        missingCursos.map((curso) => {
          const cursoRef = doc(collection(db, 'cursos'));
          return setDoc(cursoRef, curso);
        })
      );

      await loadCursos();
      showMessage('Cursos inicializados correctamente', 'success');
    } catch (error) {
      showMessage('Error al inicializar cursos', 'error');
    } finally {
      setCursosLoading(false);
    }
  };

  const handleImportMaterias = async () => {
    if (!selectedCursoIdMaterias || !materiasImportFile) {
      showMessage('Seleccione un curso y un archivo CSV', 'error');
      return;
    }

    try {
      const rows = await parseCsv(materiasImportFile);
      const materiasParaAgregar = rows
        .map((row) => ({
          name: (row.nombre ?? '').trim(),
          orden: Number(row.orden ?? ''),
        }))
        .filter((item) => item.name && Number.isFinite(item.orden));

      await Promise.all(
        materiasParaAgregar.map((materia) =>
          addMateria(selectedCursoIdMaterias, {
            name: materia.name,
            orden: materia.orden,
            active: true,
          })
        )
      );

      setMateriasImportModal(false);
      setMateriasImportFile(null);
      await loadMaterias(selectedCursoIdMaterias);
      showMessage('Materias importadas correctamente', 'success');
    } catch (error) {
      showMessage('Error al importar materias', 'error');
    }
  };

  const handleMateriaEdit = async () => {
    if (!selectedCursoIdMaterias || !materiaEdit) {
      showMessage('No se encontró la materia seleccionada', 'error');
      return;
    }

    try {
      await updateMateria(selectedCursoIdMaterias, materiaEdit.id, {
        name: materiaName,
        orden: Number(materiaOrden),
      });
      setMateriaEditModal(false);
      await loadMaterias(selectedCursoIdMaterias);
      showMessage('Materia actualizada correctamente', 'success');
    } catch (error) {
      showMessage('Error al actualizar materia', 'error');
    }
  };

  const handleMateriaCreate = async () => {
    if (!selectedCursoIdMaterias) {
      showMessage('Seleccione un curso primero', 'error');
      return;
    }

    if (!materiaName.trim() || !materiaOrden.trim() || Number.isNaN(Number(materiaOrden))) {
      showMessage('Complete nombre y orden válidos', 'error');
      return;
    }

    try {
      await addMateria(selectedCursoIdMaterias, {
        name: materiaName.trim(),
        orden: Number(materiaOrden),
        active: true,
      });
      setMateriaCreateModal(false);
      setMateriaName('');
      setMateriaOrden('');
      await loadMaterias(selectedCursoIdMaterias);
      showMessage('Materia agregada correctamente', 'success');
    } catch (error) {
      showMessage('Error al agregar materia', 'error');
    }
  };

  const handleDeleteMateria = async (materiaId: string) => {
    if (!selectedCursoIdMaterias) {
      showMessage('Seleccione un curso primero', 'error');
      return;
    }

    try {
      await deleteMateria(selectedCursoIdMaterias, materiaId);
      await loadMaterias(selectedCursoIdMaterias);
      showMessage('Materia eliminada correctamente', 'success');
    } catch (error) {
      showMessage('Error al eliminar materia', 'error');
    }
  };

  const handleImportAlumnos = async () => {
    if (!selectedCursoIdAlumnos || !alumnosImportFile) {
      showMessage('Seleccione un curso y un archivo CSV', 'error');
      return;
    }

    try {
      const rows = await parseCsv(alumnosImportFile);
      const alumnosParaAgregar = rows
        .map((row) => {
          const fechaString = (row.fechaNacimiento ?? '').trim();
          const fecha = fechaString ? new Date(fechaString) : null;
          return {
            firstName: (row.nombre ?? '').trim(),
            lastName: (row.apellido ?? '').trim(),
            dni: (row.dni ?? '').trim(),
            email: (row.email ?? '').trim(),
            fechaNacimiento:
              fecha && !Number.isNaN(fecha.getTime())
                ? Timestamp.fromDate(fecha)
                : undefined,
          };
        })
        .filter((item) => item.firstName && item.lastName && item.dni);

      await Promise.all(
        alumnosParaAgregar.map((alumno) =>
          addAlumno(
            {
              firstName: alumno.firstName,
              lastName: alumno.lastName,
              dni: alumno.dni,
              email: alumno.email || undefined,
              fechaNacimiento: alumno.fechaNacimiento,
            },
            selectedCursoIdAlumnos,
            cicloLectivo
          )
        )
      );

      setAlumnosImportModal(false);
      setAlumnosImportFile(null);
      await loadAlumnos(selectedCursoIdAlumnos);
      showMessage('Alumnos importados correctamente', 'success');
    } catch (error) {
      showMessage('Error al importar alumnos', 'error');
    }
  };
  const handleAddAlumnoIndividual = async () => {
  if (!selectedCursoIdAlumnos || !cicloLectivoActivo) {
    showMessage('Seleccione un curso primero', 'error');
    return;
  }
  if (!alumnoFirstName || !alumnoLastName || !alumnoDni) {
    showMessage('Nombre, apellido y DNI son obligatorios', 'error');
    return;
  }
  try {
    const fecha = alumnoFechaNacimiento ? new Date(alumnoFechaNacimiento) : null;
    await addAlumno(
      {
        firstName: alumnoFirstName,
        lastName: alumnoLastName,
        dni: alumnoDni,
        email: alumnoEmail || undefined,
        fechaNacimiento: fecha && !isNaN(fecha.getTime())
          ? Timestamp.fromDate(fecha)
          : undefined,
      },
      selectedCursoIdAlumnos,
      cicloLectivoActivo.anio
    );
    setAlumnoAddModal(false);
    setAlumnoFirstName('');
    setAlumnoLastName('');
    setAlumnoDni('');
    setAlumnoEmail('');
    setAlumnoFechaNacimiento('');
    await loadAlumnos(selectedCursoIdAlumnos);
    showMessage('Alumno agregado correctamente');
  } catch {
    showMessage('Error al agregar alumno', 'error');
  }
};

const handleAddProfesorIndividual = async () => {
  if (!profesorAddFirstName || !profesorAddLastName || !profesorAddEmail) {
    showMessage('Todos los campos son obligatorios', 'error');
    return;
  }
  try {
    const pendienteRef = doc(collection(db, 'profesoresPendientes'));
    await setDoc(pendienteRef, {
      firstName: profesorAddFirstName,
      lastName: profesorAddLastName,
      email: profesorAddEmail,
      role: 'profesor',
      active: true,
    });
    setProfesorAddModal(false);
    setProfesorAddFirstName('');
    setProfesorAddLastName('');
    setProfesorAddEmail('');
    await loadProfesores();
    showMessage('Profesor agregado. Será activo al ingresar por primera vez.');
  } catch {
    showMessage('Error al agregar profesor', 'error');
  }
};

  const openAlumnoEdit = (alumno: AlumnoDoc) => {
    setAlumnoEdit(alumno);
    setAlumnoFirstName(alumno.firstName);
    setAlumnoLastName(alumno.lastName);
    setAlumnoDni(alumno.dni);
    setAlumnoEmail(alumno.email ?? '');
    setAlumnoFechaNacimiento(
      alumno.fechaNacimiento
        ? new Date(alumno.fechaNacimiento.seconds * 1000).toISOString().slice(0, 10)
        : ''
    );
    setAlumnoEditModal(true);
  };

  const handleAlumnoEdit = async () => {
    if (!alumnoEdit) {
      showMessage('No se encontró el alumno seleccionado', 'error');
      return;
    }

    try {
      const fecha = alumnoFechaNacimiento ? new Date(alumnoFechaNacimiento) : null;
      await updateAlumno(alumnoEdit.id, {
        firstName: alumnoFirstName,
        lastName: alumnoLastName,
        dni: alumnoDni,
        email: alumnoEmail || undefined,
        fechaNacimiento:
          fecha && !Number.isNaN(fecha.getTime())
            ? Timestamp.fromDate(fecha)
            : undefined,
      });
      setAlumnoEditModal(false);
      await loadAlumnos(selectedCursoIdAlumnos);
      showMessage('Alumno actualizado correctamente', 'success');
    } catch (error) {
      showMessage('Error al actualizar alumno', 'error');
    }
  };

  const handleTransferAlumno = async () => {
    if (!transferAlumno || !transferTargetCursoId) {
      showMessage('Seleccione el curso destino', 'error');
      return;
    }

    try {
      await transferirAlumno(transferAlumno.id, transferTargetCursoId, cicloLectivo);
      setTransferModal(false);
      setTransferAlumno(null);
      setTransferTargetCursoId('');
      await loadAlumnos(selectedCursoIdAlumnos);
      showMessage('Alumno transferido correctamente', 'success');
    } catch (error) {
      showMessage('Error al transferir alumno', 'error');
    }
  };

  const handleImportProfesores = async () => {
    if (!profesoresImportFile) {
      showMessage('Seleccione un archivo CSV', 'error');
      return;
    }

    try {
      const rows = await parseCsv(profesoresImportFile);
      const existingEmails = new Set(profesores.map((prof) => prof.email));
      const profesoresParaAgregar = rows
        .map((row) => ({
          firstName: (row.nombre ?? '').trim(),
          lastName: (row.apellido ?? '').trim(),
          email: (row.email ?? '').trim(),
        }))
        .filter((item) => item.firstName && item.lastName && item.email && !existingEmails.has(item.email));

      await Promise.all(
        profesoresParaAgregar.map((profesor) => {
          const pendienteRef = doc(collection(db, 'profesoresPendientes'));
          return setDoc(pendienteRef, {
            firstName: profesor.firstName,
            lastName: profesor.lastName,
            email: profesor.email,
            role: 'profesor',
            active: true,
          });
        })
      );

      setProfesoresImportModal(false);
      setProfesoresImportFile(null);
      await loadProfesores();
      showMessage('Profesores importados correctamente. Serán activos al ingresar por primera vez.', 'success');
    } catch (error) {
      showMessage('Error al importar profesores', 'error');
    }
  };

  const openAssignmentModal = (profesorId: string) => {
    setSelectedProfesorId(profesorId);
    setAssignmentModal(true);
  };

  const handleAddAsignacion = async () => {
    if (!selectedProfesorId || !assignmentCourseId || !assignmentMateriaId) {
      showMessage('Seleccione profesor, curso y materia', 'error');
      return;
    }

    try {
      await addAsignacion({
        profesorRef: doc(db, 'users', selectedProfesorId) as any,
        cursoRef: doc(db, 'cursos', assignmentCourseId) as any,
        materiaRef: doc(db, 'cursos', assignmentCourseId, 'materias', assignmentMateriaId) as any,
        anioLectivo: cicloLectivo,
        active: true,
        desde: Timestamp.now(),
      });

      await loadAsignacionesForProfesor(selectedProfesorId);
      await loadProfesores();
      showMessage('Asignación agregada correctamente', 'success');
    } catch (error) {
      showMessage('Error al agregar asignación', 'error');
    }
  };

  const handleCerrarAsignacion = async (asignacionId: string) => {
    try {
      await cerrarAsignacion(asignacionId);
      if (selectedProfesorId) {
        await loadAsignacionesForProfesor(selectedProfesorId);
      }
      await loadProfesores();
      showMessage('Asignación cerrada correctamente', 'success');
    } catch (error) {
      showMessage('Error al cerrar asignación', 'error');
    }
  };

  const canShowInitializeButton = cursos.length < 24;

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Title order={2}>Listados</Title>
        <Text size="sm" c="dimmed">
          Ciclo lectivo {cicloLectivo}
        </Text>
      </Group>

      {message ? (
        <Alert color={messageType === 'error' ? 'red' : 'green'} mb="md">
          {message}
        </Alert>
      ) : null}

      <Tabs value={tab} onChange={(value) => setTab(value ?? 'cursos')}>
        <Tabs.List>
          <Tabs.Tab value="cursos">Cursos</Tabs.Tab>
          <Tabs.Tab value="materias">Materias</Tabs.Tab>
          <Tabs.Tab value="alumnos">Alumnos</Tabs.Tab>
          <Tabs.Tab value="profesores">Profesores y asignaciones</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="cursos" pt="md">
          <Group justify="space-between" mb="md">
            <Text size="lg" fw={700}>
              Cursos activos
            </Text>
            {canShowInitializeButton ? (
              <Button onClick={initializeCursos} loading={cursosLoading}>
                Inicializar cursos
              </Button>
            ) : null}
          </Group>

          {cursosLoading ? (
            <Center py="xl">
              <Loader />
            </Center>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
              {cursos.map((curso) => (
                <Card key={curso.id} shadow="sm" padding="lg" radius="md" style={{ minHeight: 120 }}>
                  <Text size="lg" fw={700}>
                    {curso.name}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Año {curso.year} • División {curso.division}
                  </Text>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="materias" pt="md">
          <Group justify="space-between" mb="md">
            <Text size="lg" fw={700}>
              Materias por curso
            </Text>
            <Group gap="xs">
              <Button
                variant="outline"
                onClick={() => {
                  setMateriaName('');
                  setMateriaOrden('');
                  setMateriaCreateModal(true);
                }}
              >
                Agregar materia
              </Button>
              <Button variant="outline" onClick={() => setMateriasImportModal(true)}>
                Importar CSV
              </Button>
            </Group>
          </Group>

          <Select
            label="Curso"
            data={cursoOptions}
            value={selectedCursoIdMaterias}
            onChange={(value) => setSelectedCursoIdMaterias(value ?? '')}
            placeholder="Seleccione un curso"
            mb="md"
          />

          {materiasLoading ? (
            <Center py="xl">
              <Loader />
            </Center>
          ) : (
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Nombre</Table.Th>
                  <Table.Th>Orden</Table.Th>
                  <Table.Th>Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {materias.map((materia) => (
                  <Table.Tr key={materia.id}>
                    <Table.Td>{materia.name}</Table.Td>
                    <Table.Td>{materia.orden}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            setMateriaEdit(materia);
                            setMateriaName(materia.name);
                            setMateriaOrden(String(materia.orden));
                            setMateriaEditModal(true);
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          color="red"
                          size="xs"
                          onClick={() => handleDeleteMateria(materia.id)}
                        >
                          Eliminar
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="alumnos" pt="md">
          <Group justify="space-between" mb="md">
  <Text size="lg" fw={700}>Alumnos por curso</Text>
  <Group gap="xs">
    <Button variant="outline" onClick={() => {
      setAlumnoFirstName('');
      setAlumnoLastName('');
      setAlumnoDni('');
      setAlumnoEmail('');
      setAlumnoFechaNacimiento('');
      setAlumnoAddModal(true);
    }}>
      Agregar alumno
    </Button>
    <Button variant="outline" onClick={() => setAlumnosImportModal(true)}>
      Importar CSV
    </Button>
  </Group>
</Group>

          <Select
            label="Curso"
            data={cursoOptions}
            value={selectedCursoIdAlumnos}
            onChange={(value) => setSelectedCursoIdAlumnos(value ?? '')}
            placeholder="Seleccione un curso"
            mb="md"
          />

          {alumnosLoading ? (
            <Center py="xl">
              <Loader />
            </Center>
          ) : (
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Apellido</Table.Th>
                  <Table.Th>Nombre</Table.Th>
                  <Table.Th>DNI</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {alumnos.map((alumno) => (
                  <Table.Tr key={alumno.id}>
                    <Table.Td>{alumno.lastName}</Table.Td>
                    <Table.Td>{alumno.firstName}</Table.Td>
                    <Table.Td>{alumno.dni}</Table.Td>
                    <Table.Td>{alumno.email || '-'}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Button variant="outline" size="xs" onClick={() => openAlumnoEdit(alumno)}>
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            setTransferAlumno(alumno);
                            setTransferTargetCursoId('');
                            setTransferModal(true);
                          }}
                        >
                          Transferir
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="profesores" pt="md">
          <Group justify="space-between" mb="md">
  <Text size="lg" fw={700}>Profesores</Text>
  <Group gap="xs">
    <Button variant="outline" onClick={() => setProfesorAddModal(true)}>
      Agregar profesor
    </Button>
    <Button variant="outline" onClick={() => setProfesoresImportModal(true)}>
      Importar CSV
    </Button>
  </Group>
</Group>

          {profesoresLoading ? (
            <Center py="xl">
              <Loader />
            </Center>
          ) : (
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Apellido</Table.Th>
                  <Table.Th>Nombre</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Asignaciones activas</Table.Th>
                  <Table.Th>Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {profesores.map((profesor) => (
                  <Table.Tr key={profesor.id}>
                    <Table.Td>{profesor.lastName}</Table.Td>
                    <Table.Td>{profesor.firstName}</Table.Td>
                    <Table.Td>{profesor.email}</Table.Td>
                    <Table.Td>{profesorAssignmentsCount[profesor.id] ?? 0}</Table.Td>
                    <Table.Td>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => openAssignmentModal(profesor.id)}
                      >
                        Gestionar asignaciones
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Tabs.Panel>
      </Tabs>

      <Modal
        opened={materiasImportModal}
        onClose={() => setMateriasImportModal(false)}
        title="Importar materias desde CSV"
      >
        <Stack>
          <Text>El CSV debe contener columnas: nombre, orden</Text>
          <FileInput
            label="Archivo CSV"
            accept=".csv"
            value={materiasImportFile}
            onChange={setMateriasImportFile}
          />
          <Group justify="flex-end">
            <Button onClick={handleImportMaterias}>Importar</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={materiaCreateModal}
        onClose={() => setMateriaCreateModal(false)}
        title="Agregar materia"
      >
        <Stack>
          <TextInput
            label="Nombre"
            value={materiaName}
            onChange={(event) => setMateriaName(event.currentTarget.value)}
          />
          <TextInput
            label="Orden"
            type="number"
            value={materiaOrden}
            onChange={(event) => setMateriaOrden(event.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button onClick={handleMateriaCreate}>Guardar</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={materiaEditModal}
        onClose={() => setMateriaEditModal(false)}
        title="Editar materia"
      >
        <Stack>
          <TextInput
            label="Nombre"
            value={materiaName}
            onChange={(event) => setMateriaName(event.currentTarget.value)}
          />
          <TextInput
            label="Orden"
            type="number"
            value={materiaOrden}
            onChange={(event) => setMateriaOrden(event.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button onClick={handleMateriaEdit}>Guardar</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={alumnosImportModal}
        onClose={() => setAlumnosImportModal(false)}
        title="Importar alumnos desde CSV"
      >
        <Stack>
          <Text>El CSV debe contener columnas: apellido, nombre, dni, email, fechaNacimiento</Text>
          <FileInput
            label="Archivo CSV"
            accept=".csv"
            value={alumnosImportFile}
            onChange={setAlumnosImportFile}
          />
          <Group justify="flex-end">
            <Button onClick={handleImportAlumnos}>Importar</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={alumnoEditModal}
        onClose={() => setAlumnoEditModal(false)}
        title="Editar alumno"
      >
        <Stack>
          <TextInput
            label="Apellido"
            value={alumnoLastName}
            onChange={(event) => setAlumnoLastName(event.currentTarget.value)}
          />
          <TextInput
            label="Nombre"
            value={alumnoFirstName}
            onChange={(event) => setAlumnoFirstName(event.currentTarget.value)}
          />
          <TextInput
            label="DNI"
            value={alumnoDni}
            onChange={(event) => setAlumnoDni(event.currentTarget.value)}
          />
          <TextInput
            label="Email"
            value={alumnoEmail}
            onChange={(event) => setAlumnoEmail(event.currentTarget.value)}
          />
          <TextInput
            label="Fecha de nacimiento"
            type="date"
            value={alumnoFechaNacimiento}
            onChange={(event) => setAlumnoFechaNacimiento(event.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button onClick={handleAlumnoEdit}>Guardar</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={transferModal}
        onClose={() => setTransferModal(false)}
        title={`Transferir alumno ${transferAlumno?.firstName ?? ''} ${transferAlumno?.lastName ?? ''}`}
      >
        <Stack>
          <Select
            label="Curso destino"
            data={cursoOptions}
            value={transferTargetCursoId}
            onChange={(value) => setTransferTargetCursoId(value ?? '')}
          />
          <Group justify="flex-end">
            <Button onClick={handleTransferAlumno}>Transferir</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={profesoresImportModal}
        onClose={() => setProfesoresImportModal(false)}
        title="Importar profesores desde CSV"
      >
        <Stack>
          <Text>El CSV debe contener columnas: apellido, nombre, email</Text>
          <FileInput
            label="Archivo CSV"
            accept=".csv"
            value={profesoresImportFile}
            onChange={setProfesoresImportFile}
          />
          <Group justify="flex-end">
            <Button onClick={handleImportProfesores}>Importar</Button>
          </Group>
        </Stack>
      </Modal>

<Modal
  opened={alumnoAddModal}
  onClose={() => setAlumnoAddModal(false)}
  title="Agregar alumno"
>
  <Stack>
    <TextInput
      label="Apellido"
      value={alumnoLastName}
      onChange={(e) => setAlumnoLastName(e.currentTarget.value)}
      required
    />
    <TextInput
      label="Nombre"
      value={alumnoFirstName}
      onChange={(e) => setAlumnoFirstName(e.currentTarget.value)}
      required
    />
    <TextInput
      label="DNI"
      value={alumnoDni}
      onChange={(e) => setAlumnoDni(e.currentTarget.value)}
      required
    />
    <TextInput
      label="Email (opcional)"
      value={alumnoEmail}
      onChange={(e) => setAlumnoEmail(e.currentTarget.value)}
    />
    <TextInput
      label="Fecha de nacimiento (opcional)"
      type="date"
      value={alumnoFechaNacimiento}
      onChange={(e) => setAlumnoFechaNacimiento(e.currentTarget.value)}
    />
    <Group justify="flex-end">
      <Button variant="outline" onClick={() => setAlumnoAddModal(false)}>
        Cancelar
      </Button>
      <Button onClick={handleAddAlumnoIndividual}>
        Agregar
      </Button>
    </Group>
  </Stack>
</Modal>

<Modal
  opened={profesorAddModal}
  onClose={() => setProfesorAddModal(false)}
  title="Agregar profesor"
>
  <Stack>
    <TextInput
      label="Apellido"
      value={profesorAddLastName}
      onChange={(e) => setProfesorAddLastName(e.currentTarget.value)}
      required
    />
    <TextInput
      label="Nombre"
      value={profesorAddFirstName}
      onChange={(e) => setProfesorAddFirstName(e.currentTarget.value)}
      required
    />
    <TextInput
      label="Email institucional"
      value={profesorAddEmail}
      onChange={(e) => setProfesorAddEmail(e.currentTarget.value)}
      required
    />
    <Group justify="flex-end">
      <Button variant="outline" onClick={() => setProfesorAddModal(false)}>
        Cancelar
      </Button>
      <Button onClick={handleAddProfesorIndividual}>
        Agregar
      </Button>
    </Group>
  </Stack>
</Modal>

      <Modal
        opened={assignmentModal}
        onClose={() => setAssignmentModal(false)}
        title="Gestionar asignaciones"
        size="lg"
      >
        <Stack>
          <Select
            label="Profesor"
            data={profesorOptions}
            value={selectedProfesorId}
            onChange={(value) => setSelectedProfesorId(value ?? '')}
          />
          <Select
            label="Curso"
            data={cursoOptions}
            value={assignmentCourseId}
            onChange={(value) => setAssignmentCourseId(value ?? '')}
          />
          <Select
            label="Materia"
            data={assignmentMaterias.map((materia) => ({
              value: materia.id,
              label: materia.name,
            }))}
            value={assignmentMateriaId}
            onChange={(value) => setAssignmentMateriaId(value ?? '')}
          />
          <Group justify="flex-end">
            <Button onClick={handleAddAsignacion}>Agregar asignación</Button>
          </Group>

          {asignacionesLoading ? (
            <Center py="xl">
              <Loader />
            </Center>
          ) : (
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Curso</Table.Th>
                  <Table.Th>Materia</Table.Th>
                  <Table.Th>Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {asignaciones.map((asignacion) => {
                  const cursoNombre = cursos.find((curso) => curso.id === asignacion.cursoRef.id)?.name ?? asignacion.cursoRef.id;
                  const materiaNombre = assignmentMaterias.find((m) => m.id === asignacion.materiaRef.id)?.name ?? asignacion.materiaRef.id;
                  return (
                    <Table.Tr key={asignacion.id}>
                      <Table.Td>{cursoNombre}</Table.Td>
                      <Table.Td>{materiaNombre}</Table.Td>
                      <Table.Td>
                        <Button
                          variant="outline"
                          size="xs"
                          color="red"
                          onClick={() => handleCerrarAsignacion(asignacion.id)}
                        >
                          Cerrar
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          )}
        </Stack>
      </Modal>
    </Box>
  );
}
