export type CalificacionState = 'normal' | 'ausente' | null;

export type MotivoHabilitacionCol7 =
  | 'dos_reprobadas_diciembre'
  | 'dos_reprobadas_febrero'
  | null;

export interface Col5State {
  value: number | null;
  estado: CalificacionState;
  habilitado: boolean;
}

export interface Col6State {
  value: number | null;
  estado: CalificacionState;
  habilitado: boolean;
}

export interface Col7State {
  value: number | null;
  estado: CalificacionState;
  habilitado: boolean;
  motivoHabilitacion: MotivoHabilitacionCol7;
}

export interface Col8State {
  value: number | null;
  estado: CalificacionState;
}

export type Promocion =
  | 'aprobado'
  | 'asignatura_previa'
  | 'no_promociona'
  | 'pendiente_6to';

export interface CalcCol4Input {
  col1: number | null;
  col2: number | null;
  col3: number | null;
}

export interface CalcCol4Result {
  value: number | null;
  formatted: string | null;
}

export interface CalcCol8Input {
  col4: number | null;
  col3: number | null;
  col5: Col5State;
  col6: Col6State;
  col7: Col7State;
}

export type Col8Source =
  | 'col4'
  | 'col5'
  | 'col6'
  | 'col7'
  | 'ausente'
  | 'none';

export interface CalcCol8Result {
  value: number | null;
  estado: CalificacionState;
  source: Col8Source;
}

export interface CalificacionPromocionItem {
  col8: Col8State;
  notaFinalManual?: number | null;
}

export interface CalcPromocionInput {
  grado: 1 | 2 | 3 | 4 | 5 | 6;
  calificaciones: Array<CalificacionPromocionItem>;
}

export interface CalcPromocionResult {
  promocion: Promocion;
  motivo: string;
}

export interface CalificacionRow {
  col1: number | null;
  col2: number | null;
  col3: number | null;
  col5: Col5State;
  col6: Col6State;
  col7: Col7State;
  col8: Col8State;
  previaActiva: boolean;
  fechaRendicionPrevia?: Date | null;
  promocion: Promocion;
  notaFinalManual?: number | null;
}
