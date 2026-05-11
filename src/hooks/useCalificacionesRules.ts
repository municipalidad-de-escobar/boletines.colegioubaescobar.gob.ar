import { useMemo } from 'react';
import { calcCol4 } from '../utils/grading';
import type {
  CalificacionFirestore,
  CicloLectivoFirestore,
} from '../types/firestore';
import type { Permission } from '../types/roles';
import type { MotivoHabilitacionCol7 } from '../types/grading';

interface CalificacionesRulesOutput {
  col5PeriodoHabilitado: boolean;
  col6PeriodoHabilitado: boolean;
  col7PeriodoHabilitado: boolean;
  col7MotivoHabilitacion: MotivoHabilitacionCol7;
  puedeEditarT1: boolean;
  puedeEditarT2: boolean;
  puedeEditarT3: boolean;
  puedeEditarTrimestres: boolean;
  puedeEditarEvaluacion: boolean;
  cicloEsCerrado: boolean;
  puedeCargarcol5: (cal: Pick<CalificacionFirestore, 'col1' | 'col2' | 'col3'>) => boolean;
  puedeCargarcol6: (cal: Pick<CalificacionFirestore, 'col1' | 'col2' | 'col3'>) => boolean;
}

interface UseCalificacionesRulesInput {
  calificaciones: CalificacionFirestore[];
  cicloLectivo: CicloLectivoFirestore;
  userPermissions: Permission[];
}

const DISABLED_OUTPUT: CalificacionesRulesOutput = {
  col5PeriodoHabilitado: false,
  col6PeriodoHabilitado: false,
  col7PeriodoHabilitado: false,
  col7MotivoHabilitacion: null,
  puedeEditarT1: false,
  puedeEditarT2: false,
  puedeEditarT3: false,
  puedeEditarTrimestres: false,
  puedeEditarEvaluacion: false,
  cicloEsCerrado: false,
  puedeCargarcol5: () => false,
  puedeCargarcol6: () => false,
};

const countReprobadas = (
  calificaciones: CalificacionFirestore[],
  colKey: 'col5' | 'col6'
): number => {
  return calificaciones.reduce((count, cal) => {
    const col = cal[colKey];
    if (
      col.estado === 'ausente' ||
      (col.value != null && col.value < 4)
    ) {
      return count + 1;
    }
    return count;
  }, 0);
};

const getCol4 = (cal: Pick<CalificacionFirestore, 'col1' | 'col2' | 'col3'>) => {
  return calcCol4({
    col1: cal.col1,
    col2: cal.col2,
    col3: cal.col3,
  });
};

export function useCalificacionesRules(
  input: UseCalificacionesRulesInput | null
): CalificacionesRulesOutput {
  return useMemo(() => {
    if (!input) return DISABLED_OUTPUT;

    const { calificaciones, cicloLectivo, userPermissions } = input;

    const cicloEsCerrado = cicloLectivo.estado === 'cerrado';
    const periodoHabilitado = cicloLectivo.periodoHabilitado;

    const col5PeriodoHabilitado =
      !cicloEsCerrado &&
      (periodoHabilitado === 'diciembre' || periodoHabilitado === 'adicional');

    const col6PeriodoHabilitado =
      !cicloEsCerrado &&
      (periodoHabilitado === 'febrero' || periodoHabilitado === 'adicional');

    const puedeCargarcol5 = (cal: Pick<CalificacionFirestore, 'col1' | 'col2' | 'col3'>): boolean => {
      if (!col5PeriodoHabilitado) return false;
      const col4Result = getCol4(cal);
      if (col4Result.value === null || cal.col3 === null) return false;
      return col4Result.value < 7 || cal.col3 < 7;
    };

    const puedeCargarcol6 = (cal: Pick<CalificacionFirestore, 'col1' | 'col2' | 'col3'>): boolean => {
      if (!col6PeriodoHabilitado) return false;
      const col4Result = getCol4(cal);
      if (col4Result.value === null) return false;
      return col4Result.value < 4;
    };

    let col7PeriodoHabilitado = false;
    let col7MotivoHabilitacion: MotivoHabilitacionCol7 = null;

    if (!cicloEsCerrado && periodoHabilitado === 'adicional') {
      const reprobadas_diciembre = countReprobadas(calificaciones, 'col5');
      const reprobadas_febrero = countReprobadas(calificaciones, 'col6');

      if (reprobadas_diciembre >= 2) {
        col7PeriodoHabilitado = true;
        col7MotivoHabilitacion = 'dos_reprobadas_diciembre';
      } else if (reprobadas_febrero >= 2) {
        col7PeriodoHabilitado = true;
        col7MotivoHabilitacion = 'dos_reprobadas_febrero';
      }
    }

    const hasEditTrimestresPermission =
      userPermissions.includes('edit_calificaciones_trimestres') && !cicloEsCerrado;

    const puedeEditarT1 = hasEditTrimestresPermission && periodoHabilitado === 't1';
    const puedeEditarT2 = hasEditTrimestresPermission && periodoHabilitado === 't2';
    const puedeEditarT3 = hasEditTrimestresPermission && periodoHabilitado === 't3';

    const puedeEditarTrimestres =
      hasEditTrimestresPermission &&
      (periodoHabilitado === 't1' ||
        periodoHabilitado === 't2' ||
        periodoHabilitado === 't3' ||
        periodoHabilitado === 'diciembre' ||
        periodoHabilitado === 'febrero' ||
        periodoHabilitado === 'adicional');

    const puedeEditarEvaluacion =
      userPermissions.includes('edit_calificaciones_evaluacion') &&
      !cicloEsCerrado &&
      (periodoHabilitado === 'diciembre' ||
        periodoHabilitado === 'febrero' ||
        periodoHabilitado === 'adicional');

    return {
      col5PeriodoHabilitado,
      col6PeriodoHabilitado,
      col7PeriodoHabilitado,
      col7MotivoHabilitacion,
      puedeEditarT1,
      puedeEditarT2,
      puedeEditarT3,
      puedeEditarTrimestres,
      puedeEditarEvaluacion,
      cicloEsCerrado,
      puedeCargarcol5,
      puedeCargarcol6,
    };
  }, [input?.calificaciones, input?.cicloLectivo, input?.userPermissions]);
}
