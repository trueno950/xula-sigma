import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeCambiarMarca } from "@/shared/auth/roles";
import { NoAutorizadoError } from "@/shared/lib/errores";
import { borrarEscudoAnterior, urlDeEscudo } from "./borradoDeEscudo";
import { escribirMarcaCompuesta } from "./escrituraDeMarca";
import type { AlmacenDeAssets, RepositorioDeMarca } from "./puertos";

/**
 * Quitar el escudo del municipio (S7).
 *
 * Borra la **referencia** de `ayuntamientos.marca` con la misma funcion que
 * usan la subida y los colores —transaccion, validacion del resultado
 * completo y traza en bitacora— y despues el **objeto** del almacen, fuera de
 * la transaccion y best-effort, igual que el escudo anterior de
 * `cambiarEscudo` (decision 7 de `design.md`).
 *
 * Ese orden es el que importa: si el segundo paso fallara, queda un objeto
 * sin referencia —basura, no una marca rota—, y el panel cae a su estado sin
 * escudo porque `(panel)/layout.tsx` lee `marca.escudo` y ya no esta.
 *
 * Quitar un escudo que no existe no es un error: deja la fila como estaba y
 * no llama al almacen. La pantalla, igual, no ofrece el boton cuando no hay
 * nada que quitar.
 */

const sinEscudo = (base: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(base).filter(([clave]) => clave !== "escudo"),
  );

export function crearQuitarEscudo(
  almacen: AlmacenDeAssets,
  repositorio: RepositorioDeMarca,
) {
  return async function quitarEscudo(contexto: ContextoActual): Promise<void> {
    if (!puedeCambiarMarca(contexto.usuario.rol)) throw new NoAutorizadoError();

    const anterior = await escribirMarcaCompuesta(
      repositorio,
      contexto,
      sinEscudo,
    );
    const url = urlDeEscudo(anterior);

    if (!url) return;

    await borrarEscudoAnterior(almacen, contexto.ayuntamientoId, url);
  };
}
