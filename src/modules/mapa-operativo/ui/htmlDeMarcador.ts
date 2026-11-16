import type { MarcadorDeMapa } from "../domain";
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
const CONTADOR =
  "position:absolute;top:-6px;right:-8px;min-width:18px;height:18px;padding:0 3px;border-radius:9999px;background:#111827;color:#fff;font:600 11px/18px system-ui,sans-serif;text-align:center";

export const htmlDeMarcador = (marcador: MarcadorDeMapa): string => {
  const cuantos = marcador.hechos.length;
  const contador =
    cuantos > 1
      ? `<span data-hechos="${cuantos}" style="${CONTADOR}">${cuantos}</span>`
      : "";
  return `<span style="${PIN};background:${escapar(marcador.color)}">${svgDeIcono(marcador.icono)}${contador}</span>`;
};

/**
 * La ventana del pin: folio -o el tipo, si es una intervencion-, tipo y
 * estado de cada hecho. Sin fecha, porque los lectores del mapa no la
 * exponen, y sin datos de la persona que reporto: el mapa nunca los pide.
 */
export const htmlDeLaVentana = (marcador: MarcadorDeMapa): string => {
  const filas = marcador.hechos
    .map(
      (hecho) =>
        `<li style="margin-bottom:4px">` +
        `<a href="${escapar(hecho.href)}">${escapar(hecho.etiqueta)}</a> · ` +
        `${escapar(hecho.etiquetaDeTipo)} · ${escapar(hecho.etiquetaDeEstado)}` +
        `</li>`,
    )
    .join("");
  return `<ul style="margin:0;padding-left:16px">${filas}</ul>`;
};
