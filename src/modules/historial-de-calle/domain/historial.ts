export type NaturalezaDeHistorial =
  | "REPORTE"
  | "INTERVENCION"
  | "RENOMBRE"
  | "REPARENTEO"
  | "UBICACION";
export type EstadoDeHistorial = "VACIO" | "CON_DATOS";

declare const marca: unique symbol;
export type CalleId = string & { readonly [marca]: "CalleDeHistorialId" };
const PATRON_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const comoCalleId = (valor: string): CalleId => {
  if (!PATRON_UUID.test(valor)) throw new Error("CalleId invalido.");
  return valor as CalleId;
};

export type PuntoDeHistorial = { latitud: number; longitud: number };
export type CambioDeCalle = {
  nombre: { anterior: string | null; nuevo: string | null };
  punto: { anterior: PuntoDeHistorial | null; nuevo: PuntoDeHistorial | null };
  lugar: { anterior: string | null; nuevo: string | null };
};
export type EventoEstructuralParaHistorial = {
  id: string;
  naturaleza: Exclude<NaturalezaDeHistorial, "REPORTE" | "INTERVENCION">;
  ocurridoEn: Date;
  cambio: CambioDeCalle | null;
};
export type CalleParaHistorial = readonly EventoEstructuralParaHistorial[];
export type ReporteParaHistorial = { id: string; registradoEn: Date };
export type IntervencionParaHistorial = {
  id: string;
  fechaDeOcurrencia: string;
};
export type PrecisionDeEntrada = "DIA" | "MOMENTO";
export type EntradaDeHistorial = {
  id: string;
  naturaleza: NaturalezaDeHistorial;
  ocurridoEn: Date;
  precision: PrecisionDeEntrada;
  cambio: CambioDeCalle | null;
};
export type HistorialDeCalle = {
  calleId: CalleId;
  estado: EstadoDeHistorial;
  entradas: readonly EntradaDeHistorial[];
};

const RANGO_DE_NATURALEZA: Record<NaturalezaDeHistorial, number> = {
  REPORTE: 0,
  INTERVENCION: 1,
  RENOMBRE: 2,
  REPARENTEO: 3,
  UBICACION: 4,
};
// Solo sirve para ordenar: la fecha civil no trae hora, y `precision: "DIA"`
// le avisa a la vista que no debe mostrar la medianoche UTC como si lo fuera.
const fechaDeOcurrenciaComoMomento = (fecha: string) =>
  new Date(`${fecha}T00:00:00.000Z`);
const compararEntradas = (
  izquierda: EntradaDeHistorial,
  derecha: EntradaDeHistorial,
) => {
  const porFecha =
    derecha.ocurridoEn.getTime() - izquierda.ocurridoEn.getTime();
  if (porFecha !== 0) return porFecha;
  const porNaturaleza =
    RANGO_DE_NATURALEZA[izquierda.naturaleza] -
    RANGO_DE_NATURALEZA[derecha.naturaleza];
  return porNaturaleza || izquierda.id.localeCompare(derecha.id);
};
export const componerHistorialDeCalle = (datos: {
  calleId: CalleId;
  eventos: readonly EventoEstructuralParaHistorial[];
  reportes: readonly ReporteParaHistorial[];
  intervenciones: readonly IntervencionParaHistorial[];
}): HistorialDeCalle => {
  const entradas: EntradaDeHistorial[] = [
    ...datos.reportes.map(({ id, registradoEn }) => ({
      id,
      naturaleza: "REPORTE" as const,
      ocurridoEn: registradoEn,
      precision: "MOMENTO" as const,
      cambio: null,
    })),
    ...datos.intervenciones.map(({ id, fechaDeOcurrencia }) => ({
      id,
      naturaleza: "INTERVENCION" as const,
      ocurridoEn: fechaDeOcurrenciaComoMomento(fechaDeOcurrencia),
      precision: "DIA" as const,
      cambio: null,
    })),
    ...datos.eventos.map((evento) => ({
      ...evento,
      precision: "MOMENTO" as const,
    })),
  ].sort(compararEntradas);
  return {
    calleId: datos.calleId,
    estado: entradas.length > 0 ? "CON_DATOS" : "VACIO",
    entradas,
  };
};
