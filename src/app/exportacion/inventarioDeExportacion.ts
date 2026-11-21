import type { ContextoActual } from "@/shared/auth/contexto";
import {
  type Inventario,
  inventarioDeAyuntamiento,
} from "@/shared/exportacion/inventario";
import { porciones } from "./porciones";

/**
 * El inventario de la pantalla de exportacion, con la composicion de este
 * proyecto: las mismas porciones que arma el ZIP.
 *
 * Vive aca y no en `shared` por la misma razon que `porciones.ts`: `shared`
 * no conoce los modulos, y la lista de conjuntos se compone donde se conocen.
 * La pantalla la consume a traves de este archivo, que es lo que un test
 * puede mockear sin abrir la base.
 */
export const inventarioDeExportacion = async (
  contexto: ContextoActual,
): Promise<Inventario> => inventarioDeAyuntamiento(contexto, porciones);
