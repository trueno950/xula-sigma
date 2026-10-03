import { lineaDe, sinComentariosNiCadenas } from "../comunes";
import type { Regla } from "../tipos";

/**
 * Una pantalla a mas de un nivel de la raiz de su seccion -un detalle, una
 * captura, una pantalla de administracion anidada- necesita `migaja` en su
 * `PaginaDePanel`: sin eso no hay forma de volver salvo el boton del
 * navegador. La regla completa, con el porque, vive en `DESIGN.md`, seccion
 * 5, "Navegacion (migas de pan)" -antipatron 23, una sola copia.
 *
 * La raiz de una seccion (`/constancias`, `/padron`) no lleva: no hay padre
 * al que subir, y `segmentos.length < 2` es exactamente esa condicion en la
 * ruta del archivo. Un grupo de rutas, `(lista)`, no es un segmento de la
 * URL y no cuenta.
 */
export const paginaAnidadaSinMigaja: Regla = {
  id: "pagina-anidada-sin-migaja",
  antipatron: 26,
  titulo: "PaginaDePanel anidado sin migaja",
  revisar(archivos) {
    const hallazgos = [];

    for (const archivo of archivos) {
      const encontrado = /^src\/app\/\(panel\)\/(.+)\/page\.tsx$/.exec(
        archivo.ruta,
      );
      if (!encontrado) continue;

      const segmentos = (encontrado[1] as string)
        .split("/")
        .filter((segmento) => !/^\(.+\)$/.test(segmento));
      if (segmentos.length < 2) continue;

      const codigo = sinComentariosNiCadenas(archivo.contenido);

      for (const apertura of codigo.matchAll(/<PaginaDePanel\b/g)) {
        const inicio = apertura.index;
        const fin = finDeEtiqueta(codigo, inicio + apertura[0].length);
        if (fin === null) continue;

        if (/\bmigaja\s*=/.test(codigo.slice(inicio, fin))) continue;

        hallazgos.push({
          ruta: archivo.ruta,
          linea: lineaDe(codigo, inicio),
          mensaje:
            "PaginaDePanel esta a mas de un nivel de su seccion y no pasa " +
            "`migaja`. DESIGN.md, seccion 6, Navegacion.",
        });
      }
    }

    return hallazgos;
  },
};

/**
 * El `>` que cierra la etiqueta de apertura, contando llaves para no
 * confundirlo con el de un JSX anidado dentro de una prop -`accion={<Boton
 * />}` trae su propio `/>` antes del cierre real-. `null` si no cierra: una
 * etiqueta sin cerrar no se puede leer, y el costo de no alarmar es menor
 * que el de una falsa alarma.
 */
function finDeEtiqueta(codigo: string, desde: number): number | null {
  let profundidad = 0;

  for (let i = desde; i < codigo.length; i++) {
    const caracter = codigo[i];
    if (caracter === "{") profundidad++;
    else if (caracter === "}") profundidad--;
    else if (caracter === ">" && profundidad === 0) return i;
  }

  return null;
}
