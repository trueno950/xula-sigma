import { z } from "zod";
import {
  ACCIONES_DE_NODO,
  type AccionDeNodo,
  type CalleId,
  CLAVES_DE_CONFIRMACION,
  type ClaveDeConfirmacion,
  comoCalleId,
  comoDomicilioId,
  comoLugarId,
  type DomicilioId,
  type LugarId,
  type NodoSeleccionado,
  type TabDeLugar,
} from "@/modules/territorio";
import type { NodoDeSubarbol } from "@/modules/territorio/application/puertos";

/**
 * La lectura de `?raiz=&nodo=&vista=&accion=` y la resolucion del nodo
 * actual dentro del subarbol.
 *
 * Vive aparte de `page.tsx` por la metrica de 200 lineas de `AGENTS.md`, y
 * el corte cae por tema: aca se interpreta la URL, alla se compone la
 * pantalla. La pagina quedo en 202 lineas cuando la accion de renombrar
 * calle sumo su rama.
 */
export type ParametrosDeTerritorio = {
  calleId: CalleId | undefined;
  domicilioId: DomicilioId | undefined;
  raizId: LugarId | undefined;
  nodoId: LugarId | undefined;
  accion: AccionDeNodo | undefined;
  error: string | undefined;
  ok: ClaveDeConfirmacion | undefined;
  vista: TabDeLugar;
};

/**
 * Cada campo cae a `undefined` por su cuenta -`.catch()`, no un
 * `.safeParse()` de todo el objeto-. Con el objeto entero, un `vista`
 * fuera de las cuatro validas tiraba tambien la `raiz`: `raizId` volvia
 * `undefined` y `page.tsx` no llegaba a preguntar si la raiz es ajena,
 * asi que una raiz de otro municipio con un `vista` roto caia al listado
 * del municipio propio en 200 en vez del 404 de la regla 8.
 */
const esquemaDeParametros = z.object({
  calle: z.string().uuid().optional().catch(undefined),
  domicilio: z.string().uuid().optional().catch(undefined),
  raiz: z.string().uuid().optional().catch(undefined),
  nodo: z.string().uuid().optional().catch(undefined),
  vista: z
    .enum(["lugares", "calles", "domicilios", "editar"])
    .optional()
    .catch(undefined),
  accion: z.enum(ACCIONES_DE_NODO).optional().catch(undefined),
  error: z.string().optional().catch(undefined),
  ok: z.enum(CLAVES_DE_CONFIRMACION).optional().catch(undefined),
});

/** A que pestana pertenece cada accion, para no perder el contexto. */
const pestanaDeAccion: Record<AccionDeNodo, TabDeLugar> = {
  lugar: "lugares",
  calle: "calles",
  ubicarCalle: "calles",
  reparentearCalle: "calles",
  bajaCalle: "calles",
  renombrarCalle: "calles",
  domicilio: "domicilios",
  corregirDomicilio: "domicilios",
  bajaDomicilio: "domicilios",
  renombrar: "editar",
  reparentear: "editar",
  baja: "editar",
};

export const leerParametros = (
  searchParams: Record<string, string | string[] | undefined>,
): ParametrosDeTerritorio => {
  // Cada campo ya cae solo con `.catch()`: este parse no falla.
  const datos = esquemaDeParametros.parse(searchParams);
  const accion = datos.accion as AccionDeNodo | undefined;

  return {
    calleId: datos.calle ? comoCalleId(datos.calle) : undefined,
    domicilioId: datos.domicilio ? comoDomicilioId(datos.domicilio) : undefined,
    raizId: datos.raiz ? comoLugarId(datos.raiz) : undefined,
    nodoId: datos.nodo ? comoLugarId(datos.nodo) : undefined,
    accion,
    error: datos.error,
    // Un fallo y un exito juntos no pasan solos: el error gana, y la
    // pantalla no celebra una accion que el mismo URL dice que fallo.
    ok: datos.error ? undefined : datos.ok,
    // La accion fija su pestana; sin accion vale la elegida (o Lugares).
    vista: accion ? pestanaDeAccion[accion] : (datos.vista ?? "lugares"),
  };
};

export const nodoResuelto = ({
  raiz,
  nodos,
  nodoId,
}: {
  raiz: NodoSeleccionado | null;
  nodos: readonly NodoDeSubarbol[];
  nodoId: LugarId | undefined;
}): NodoSeleccionado | null => {
  if (!raiz) return null;

  // Sin `?nodo=` se esta "adentro" de la raiz: ella es el lugar actual.
  // La raiz no esta en `nodos` (el subarbol la excluye).
  if (!nodoId || nodoId === raiz.id) return raiz;

  const encontrado = nodos.find(
    (nodo): nodo is Extract<NodoDeSubarbol, { clase: "lugar" }> =>
      nodo.clase === "lugar" && nodo.id === nodoId,
  );

  return encontrado
    ? {
        id: encontrado.id,
        tipo: encontrado.tipo,
        nombre: encontrado.nombre,
      }
    : null;
};
