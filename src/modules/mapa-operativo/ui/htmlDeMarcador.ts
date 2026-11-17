import { fechaCivilCorta } from "@/shared/lib/fecha";
import {
  colorVerificado,
  type HechoEnMarcador,
  type MarcadorDeMapa,
} from "../domain";
import { escapar } from "./escaparHtml";
import { svgDeIcono } from "./iconosDelMapa";

/**
 * El pin: el mismo objeto para un hecho solo y para varios. El color y el
 * icono vienen resueltos desde el servidor en el marcador; aca solo se
 * escriben. Estilos en linea y no clases porque esta cadena se arma en
 * tiempo de ejecucion y el generador de CSS nunca la veria.
 */
const PIN =
  "display:flex;align-items:center;justify-content:center;position:relative;width:30px;height:30px;border-radius:9999px;color:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45)";
/**
 * La insignia del pin: el numero de orden de su fila en el panel (L3). No es
 * el conteo de hechos -eso lo dicen la fila y la ventana-: es la liga entre
 * las dos vistas, y dos numeros distintos para la misma calle se
 * desincronizan sin que nada falle.
 */
const ORDEN =
  "position:absolute;top:-6px;right:-8px;min-width:18px;height:18px;padding:0 3px;border-radius:9999px;background:#111827;color:#fff;font:600 11px/18px system-ui,sans-serif;text-align:center";
/**
 * El aro del atraso (S1): el pin de una calle con algun reporte pasado del
 * umbral del municipio. Va como `box-shadow` y no como una segunda capa: el
 * pin ya tiene su borde blanco y su color de estado, y el aro dice lo unico
 * que el color no puede decir -que ese hecho lleva demasiado tiempo ahi-.
 */
const ARO_DE_ATRASO = ";box-shadow:0 0 0 3px #b91c1c,0 1px 4px rgba(0,0,0,.45)";

const diasDeAtrasoDe = (marcador: MarcadorDeMapa): number | null =>
  marcador.hechos.reduce<number | null>(
    (mayor, hecho) =>
      hecho.diasDeAtraso === null
        ? mayor
        : Math.max(mayor ?? 0, hecho.diasDeAtraso),
    null,
  );

export const htmlDeMarcador = (marcador: MarcadorDeMapa): string => {
  const insignia = `<span data-orden="${marcador.orden}" style="${ORDEN}">${marcador.orden}</span>`;
  const atrasados = diasDeAtrasoDe(marcador);
  const aro = atrasados === null ? "" : ARO_DE_ATRASO;
  // `data-atrasado="1"` es lo que el E2E lee: el aro se ve, pero un test no
  // puede afirmar un `box-shadow`.
  const marca = atrasados === null ? "" : ' data-atrasado="1"';
  return `<span${marca} style="${PIN};background:${colorVerificado(marcador.color)}${aro}">${svgDeIcono(marcador.icono)}${insignia}</span>`;
};

/**
 * S4: la fecha del hecho, en fecha civil. `fechaCivilCorta` es la de
 * `shared/lib/fecha` para una fecha ya civil -el registro de un reporte o la
 * ocurrencia de una obra-, y no `fechaEnMerida`: esa convierte un instante, y
 * aca no hay instante que convertir. Un hecho sin fecha no pinta `<time>`.
 */
const fechaDeLaVentana = (hecho: HechoEnMarcador): string =>
  hecho.fechaCivil === ""
    ? ""
    : ` · <time datetime="${escapar(hecho.fechaCivil)}">${escapar(
        fechaCivilCorta(hecho.fechaCivil),
      )}</time>`;

const atrasoDeLaVentana = (dias: number | null): string =>
  dias === null
    ? ""
    : ` · <strong>Atrasado · ${dias} ${dias === 1 ? "día" : "días"}</strong>`;

/**
 * La ventana del pin: el nombre de la calle, cuantos hechos lleva -lo mismo
 * que dice su fila-, y cada hecho con folio, tipo, estado, fecha y dias de
 * atraso. Sin datos de la persona que reporto: el mapa nunca los pide.
 */
export const htmlDeLaVentana = (marcador: MarcadorDeMapa): string => {
  const cuantos = marcador.hechos.length;
  const filas = marcador.hechos
    .map(
      (hecho) =>
        `<li style="margin-bottom:4px">` +
        `<a href="${escapar(hecho.href)}">${escapar(hecho.etiqueta)}</a> · ` +
        `${escapar(hecho.etiquetaDeTipo)} · ${escapar(hecho.etiquetaDeEstado)}` +
        `${fechaDeLaVentana(hecho)}` +
        `${atrasoDeLaVentana(hecho.diasDeAtraso)}` +
        `</li>`,
    )
    .join("");
  return (
    `<p style="margin:0 0 4px"><strong>${escapar(marcador.calleNombre)}</strong></p>` +
    `<p style="margin:0 0 8px">${cuantos} ${cuantos === 1 ? "hecho" : "hechos"} en esta calle</p>` +
    `<ul style="margin:0;padding-left:16px">${filas}</ul>`
  );
};
