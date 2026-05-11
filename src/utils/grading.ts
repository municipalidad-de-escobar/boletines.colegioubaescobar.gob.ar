import type {
  CalcCol4Input,
  CalcCol4Result,
  CalcCol8Input,
  CalcCol8Result,
  CalcPromocionInput,
  CalcPromocionResult,
  CalificacionPromocionItem,
} from '../types/grading';

const formatDecimal = (value: number): string => {
  const integerPart = Math.trunc(value);
  const fraction = Number((value - integerPart).toFixed(2));

  if (fraction === 0) {
    return String(integerPart);
  }

  const fractionString = fraction.toFixed(2).slice(2);
  return `${integerPart},${fractionString}`;
};

const roundToCol4 = (rawValue: number): number => {
  const integerPart = Math.floor(rawValue);
  const fraction = rawValue - integerPart;

  if (fraction < 0.1667) {
    return integerPart;
  }

  if (fraction < 0.5) {
    return Number((integerPart + 0.33).toFixed(2));
  }

  if (fraction < 0.8333) {
    return Number((integerPart + 0.66).toFixed(2));
  }

  return integerPart + 1;
};

export function calcCol4(input: CalcCol4Input): CalcCol4Result {
  const { col1, col2, col3 } = input;

  if (col1 == null || col2 == null || col3 == null) {
    return { value: null, formatted: null };
  }

  const rawAverage = (col1 + col2 + col3) / 3;
  const value = roundToCol4(rawAverage);

  return {
    value,
    formatted: formatDecimal(value),
  };
}

const isAusente = (col: { estado: string | null }): boolean =>
  col.estado === 'ausente';

const hasPassingValue = (col: { value: number | null; estado: string | null }) =>
  col.value != null && col.estado === 'normal' && col.value >= 4;

export function calcCol8(input: CalcCol8Input): CalcCol8Result {
  const { col4, col3, col5, col6, col7 } = input;

  if (col5.habilitado && isAusente(col5)) {
    return {
      value: null,
      estado: 'ausente',
      source: 'ausente',
    };
  }

  if (col6.habilitado && isAusente(col6)) {
    return {
      value: null,
      estado: 'ausente',
      source: 'ausente',
    };
  }

  if (col7.habilitado && isAusente(col7)) {
    return {
      value: null,
      estado: 'ausente',
      source: 'ausente',
    };
  }

  if (col4 != null && col3 != null && col4 >= 7 && col3 >= 7) {
    return {
      value: col4,
      estado: 'normal',
      source: 'col4',
    };
  }

  if (hasPassingValue(col5)) {
    return {
      value: col5.value,
      estado: 'normal',
      source: 'col5',
    };
  }

  if (hasPassingValue(col6)) {
    return {
      value: col6.value,
      estado: 'normal',
      source: 'col6',
    };
  }

  if (col7.habilitado && col7.value != null && col7.estado === 'normal') {
    return {
      value: col7.value,
      estado: 'normal',
      source: 'col7',
    };
  }

  return {
    value: null,
    estado: null,
    source: 'none',
  };
}

const countReprobadas = (calificaciones: CalificacionPromocionItem[]): number =>
  calificaciones.reduce((count, item) => {
    const { col8, notaFinalManual } = item;

    if (notaFinalManual != null && notaFinalManual >= 4) {
      return count;
    }

    const isFailed =
      col8.estado === 'ausente' ||
      (col8.value != null && col8.value < 4);

    return isFailed ? count + 1 : count;
  }, 0);

export function calcPromocion(input: CalcPromocionInput): CalcPromocionResult {
  const { grado, calificaciones } = input;
  const reprobadas = countReprobadas(calificaciones);

  if (grado >= 1 && grado <= 5) {
    if (reprobadas === 0) {
      return {
        promocion: 'aprobado',
        motivo: 'Todas las materias aprobadas en el ciclo.',
      };
    }

    if (reprobadas === 1) {
      return {
        promocion: 'asignatura_previa',
        motivo: 'Una materia con nota final insuficiente o ausente.',
      };
    }

    return {
      promocion: 'no_promociona',
      motivo: 'Dos o más materias con nota final insuficiente o ausente.',
    };
  }

  if (grado === 6) {
    if (reprobadas === 0) {
      return {
        promocion: 'aprobado',
        motivo: 'Todas las materias aprobadas en 6° año.',
      };
    }

    return {
      promocion: 'pendiente_6to',
      motivo:
        'El alumno tiene materias pendientes para resolución posterior en 6° año.',
    };
  }

  return {
    promocion: 'aprobado',
    motivo: 'Promoción determinada por reglas de ciclo no especificadas.',
  };
}
