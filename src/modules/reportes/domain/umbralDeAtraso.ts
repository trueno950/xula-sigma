import type { EstadoDeReporte } from "./estado";

/**
 * S1 de `gestion-municipal`: cuantos dias sin atender marcan un reporte como
 * atrasado. Lo fija cada ayuntamiento -el valor por defecto es el 7 que
 * recomendo el recorrido, y el rango es el que cabe en un formulario de una
 * sola cifra util-, y lo aplica esta funcion pura, sin base ni reloj: el
 * llamador pasa la fecha civil de hoy y la del registro.
 *
 * Las dos fechas son civiles (`YYYY-MM-DD`, la del calendario de Merida) y no
 * instantes: el atraso se mide en dias que ve una persona, y dos reportes de
 * las 23:00 y las 00:30 del mismo dia civil llevan los mismos dias. Quien
 * convierte un instante a fecha civil es `shared/lib/fecha`; el dominio no
 * conoce zonas horarias.
 */
export const UMBRAL_DE_ATRASO_POR_DEFECTO = 7;

export const UMBRAL_DE_ATRASO_MINIMO = 1;

export const UMBRAL_DE_ATRASO_MAXIMO = 90;

export const esUmbralDeAtraso = (valor: number): boolean =>
  Number.isInteger(valor) &&
  valor >= UMBRAL_DE_ATRASO_MINIMO &&
  valor <= UMBRAL_DE_ATRASO_MAXIMO;

const MILISEGUNDOS_POR_DIA = 86_400_000;

/**
 * `null` cuando alguna de las dos no es una fecha civil: un valor ilegible no
 * puede inventar un atraso, y `NaN` se propaga sin ruido por una resta.
 */
const diasEntreFechasCiviles = (
  desde: string,
  hasta: string,
): number | null => {
  const inicio = Date.parse(`${desde}T00:00:00Z`);
  const fin = Date.parse(`${hasta}T00:00:00Z`);

  if (Number.isNaN(inicio) || Number.isNaN(fin)) return null;

  return Math.round((fin - inicio) / MILISEGUNDOS_POR_DIA);
};

/**
 * La fecha civil de corte: hoy menos el umbral. Un reporte `RECIBIDO`
 * registrado ese dia o antes ya esta atrasado, que es la misma frontera que
 * aplica `diasDeAtraso` -y lo que el listado usa como condicion de SQL, para
 * filtrar antes de paginar en vez de esconder filas de la pagina-.
 */
export const fechaDeCorte = (hoy: string, umbral: number): string =>
  new Date(Date.parse(`${hoy}T00:00:00Z`) - umbral * MILISEGUNDOS_POR_DIA)
    .toISOString()
    .slice(0, 10);

/**
 * Los dias de atraso de un reporte, o `null` si no esta atrasado.
 *
 * Solo `RECIBIDO` cuenta: un reporte en atencion, resuelto o rechazado ya
 * tuvo respuesta, y seguir contandolo convertiria la insignia en una lista
 * de todo lo viejo del municipio. La frontera es inclusiva -exactamente N
 * dias ya es atraso-, porque el umbral se lee como "a partir de cuantos
 * dias se avisa".
 */
export const diasDeAtraso = (opciones: {
  estado: EstadoDeReporte;
  fechaDeRegistro: string;
  hoy: string;
  umbral: number;
}): number | null => {
  if (opciones.estado !== "RECIBIDO") return null;

  const dias = diasEntreFechasCiviles(opciones.fechaDeRegistro, opciones.hoy);

  if (dias === null || dias < opciones.umbral) return null;

  return dias;
};
