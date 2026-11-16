import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeCambiarMarca } from "@/shared/auth/roles";
import { NoAutorizadoError } from "@/shared/lib/errores";
import { PRIMARIO_TEXTO_POR_DEFECTO, textoSobre } from "@/shared/marca";
import type { ColoresCambiados, EntradaDeColores } from "../types";
import { escribirMarcaCompuesta } from "./escrituraDeMarca";
import type { RepositorioDeMarca } from "./puertos";

/**
 * Elegir los colores del municipio (S1-S3).
 *
 * El texto del primario no entra por parametro: lo elige `textoSobre` y se
 * guarda en `primarioTexto` (S2). La reja de contraste no se repite aca —la
 * corre `escribirMarcaCompuesta` sobre el resultado completo, o sea
 * `primario` contra el `primarioTexto` que acaba de elegir el servidor—, que
 * es la misma que protege al escudo.
 */

const coloresDe = (entrada: EntradaDeColores): ColoresCambiados => ({
  primario: entrada.primario,
  // `null` solo si el primario no se puede medir, y en ese caso
  // `validarMarca` rechaza el campo: el marcador no llega a escribirse.
  primarioTexto: textoSobre(entrada.primario) ?? PRIMARIO_TEXTO_POR_DEFECTO,
  secundario: entrada.secundario,
});

export function crearCambiarColores(repositorio: RepositorioDeMarca) {
  return async function cambiarColores(
    entrada: EntradaDeColores,
    contexto: ContextoActual,
  ): Promise<ColoresCambiados> {
    if (!puedeCambiarMarca(contexto.usuario.rol)) throw new NoAutorizadoError();

    const colores = coloresDe(entrada);

    await escribirMarcaCompuesta(repositorio, contexto, (base) => ({
      ...base,
      ...colores,
    }));

    return colores;
  };
}
