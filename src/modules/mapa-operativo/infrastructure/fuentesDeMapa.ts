import { listarIntervencionesParaMapa } from "@/modules/intervenciones";
import { leerUmbralDeAtraso, listarReportesParaMapa } from "@/modules/reportes";
import {
  callesParaMapa,
  callesSinPunto,
  comoLugarId,
  listarRaices,
  subarbol,
} from "@/modules/territorio";
import { fechaYHoraIsoEnMerida } from "@/shared/lib/fecha";
import type { FuentesDeMapa } from "../application";

/**
 * La fecha civil del registro, en `America/Merida`, para la senal de atraso
 * (S1). Sale de `shared/lib/fecha` -cuya forma `YYYY-MM-DD HH:MM` empieza con
 * el dia civil- y no de `getDate()`: el servidor corre en UTC, y un reporte
 * de las 23:00 en Merida es del dia siguiente para el proceso.
 */
const fechaCivilDe = (instante: Date): string =>
  fechaYHoraIsoEnMerida(instante).slice(0, 10);

export const fuentesDeMapa: FuentesDeMapa = {
  async callesParaMapa(contexto) {
    const calles = await callesParaMapa(contexto);
    return calles.map(({ id, nombre, lugarId, punto }) => ({
      id,
      nombre,
      lugarId,
      punto,
    }));
  },
  /**
   * S3: las calles sin punto las resuelve `territorio`, que es el dueno de la
   * jerarquia; el mapa solo las agrupa por la raiz que ya traen.
   */
  async callesSinUbicar(contexto) {
    const calles = await callesSinPunto(contexto);
    return calles.map((calle) => ({
      calleId: String(calle.calleId),
      calleNombre: calle.calleNombre,
      lugarId: String(calle.lugarId),
      raizId: String(calle.raizId),
      raizNombre: calle.raizNombre,
    }));
  },
  async reportesParaMapa(contexto) {
    const reportes = await listarReportesParaMapa(contexto);
    return reportes.map(
      ({
        id,
        folio,
        tipo,
        estado,
        areaResponsable,
        calleId,
        lugarId,
        registradoEn,
      }) => ({
        id,
        folio,
        tipo,
        estado,
        areaResponsable,
        calleId,
        lugarId,
        fechaDeRegistro: fechaCivilDe(registradoEn),
      }),
    );
  },
  /**
   * El umbral lo posee `reportes`: el mapa lo pide por su API publica y no
   * reimplementa la lectura de `configuracion_de_reportes`.
   */
  async umbralDeAtraso(contexto) {
    return leerUmbralDeAtraso(contexto);
  },
  async intervencionesParaMapa(contexto) {
    const intervenciones = await listarIntervencionesParaMapa(contexto);
    return intervenciones.map(
      ({ id, tipo, estado, calleId, lugarId, fechaDeOcurrencia }) => ({
        id,
        tipo,
        estado,
        calleId,
        lugarId,
        fechaDeOcurrencia,
      }),
    );
  },
  async territoriosParaMapa(contexto) {
    const raices = await listarRaices(contexto);
    return raices.map(({ id, nombre }) => ({ id, nombre }));
  },
  async lugaresDelSubarbol(contexto, lugarId) {
    const nodos = await subarbol(comoLugarId(lugarId), contexto, {
      soloLugares: true,
    });
    return nodos
      .filter((nodo) => nodo.clase === "lugar")
      .map((nodo) => String(nodo.id));
  },
};
