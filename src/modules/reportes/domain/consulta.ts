import type { EstadoDeReporte } from "./estado";
import type { TipoDeIncidencia } from "./tipoDeIncidencia";

/**
 * Proyeccion publica de un reporte (design.md seccion 14). Puro, sin
 * dependencias de produccion -ni siquiera Zod-: los dos imports son de
 * tipo, se borran en la compilacion.
 *
 * Cinco propiedades que no existen en ninguna de las dos variantes:
 * `folio`, `descripcion`, `referencia`, `areaResponsable` y cualquier dato
 * del reportante. Y una que tampoco: no hay campo que diga que el folio es
 * un duplicado. Ninguna rama puede colgarlas aunque quisiera.
 */
export type ConsultaDeReporte =
  | { readonly resultado: "SIN_REGISTRO" }
  | {
      readonly resultado: "REGISTRADO";
      readonly tipo: TipoDeIncidencia;
      readonly estado: EstadoDeReporte;
      readonly registradoEn: string;
      readonly actualizadoEn: string;
    };

/**
 * Constante congelada y no un literal por rama: las ramas negativas
 * devuelven esta referencia, nunca una copia.
 */
export const SIN_REGISTRO: ConsultaDeReporte = Object.freeze({
  resultado: "SIN_REGISTRO",
} as const);

export type FilaDeConsulta = {
  tipo: TipoDeIncidencia;
  estado: EstadoDeReporte;
  registradoEn: string;
  actualizadoEn: string;
};

/**
 * `tipo` y `registradoEn` del consultado; `estado` y `actualizadoEn` del
 * original. El corte no es arbitrario: cada campo viene de la fila que
 * responde la pregunta que ese campo hace.
 *
 * `registradoEn` responde "¿cuando avise yo?", un hecho del reporte
 * consultado. `estado` responde "¿van a taparla?", un hecho del original.
 * `actualizadoEn` acompania al estado porque fecha ese mismo hecho.
 *
 * `original ?? consultado` es una degradacion que el FK compuesto vuelve
 * inalcanzable, y se escribe igual porque el efecto -reintroducir el
 * `RECHAZADO` crudo- tiene que quedar nombrado.
 */
export const proyectarConsulta = (
  consultado: FilaDeConsulta | null,
  original: FilaDeConsulta | null,
): ConsultaDeReporte => {
  if (consultado === null) return SIN_REGISTRO;

  const vigente = original ?? consultado;

  return {
    resultado: "REGISTRADO",
    tipo: consultado.tipo,
    estado: vigente.estado,
    registradoEn: consultado.registradoEn,
    actualizadoEn: vigente.actualizadoEn,
  };
};
