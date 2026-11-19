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
// Por la ruta y no por el barril: los tests de la pagina simulan el barril y
// este tope se lee al cargar el modulo, antes de que el doble exista.
import { LIMITE_MAXIMO } from "@/modules/territorio/application/registroDeDomicilios";
import { esquemaDeRegreso } from "@/modules/territorio/ui/regresoAFicha";

/**
 * La lectura de `?raiz=&nodo=&vista=&accion=&q=&limite=` y la resolucion del nodo
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
  busqueda: string | undefined;
  /** El `?limite=` de Calles y Domicilios; `undefined` es la primera pagina. */
  limite?: number | undefined;
  nodoId: LugarId | undefined;
  accion: AccionDeNodo | undefined;
  error: string | undefined;
  ok: ClaveDeConfirmacion | undefined;
  /** `?nuevo=`: el lugar que el alta acaba de crear, para enlazarlo. */
  nuevo?: LugarId | undefined;
  vista: TabDeLugar;
  regreso?: string | undefined;
  /** El token opaco de lo capturado en un rechazo; ver `borradorEnCookie.ts`. */
  borrador?: string | undefined;
};

const LARGO_MAXIMO_DE_BUSQUEDA = 100;

/**
 * Las vistas que la URL todavia puede nombrar, incluida «editar», que dejo
 * de ser pestana en S3 de `odd/tasks/territorio-ux.md`. Se sigue aceptando
 * porque esta en el historial de los navegadores y en los enlaces ya
 * enviados: cae a la pestana base en vez de a un 404.
 */
const VISTAS_DE_URL = ["lugares", "calles", "domicilios", "editar"] as const;

type VistaDeUrl = (typeof VISTAS_DE_URL)[number];

const vistaDe = (vista: VistaDeUrl | undefined): TabDeLugar =>
  vista === undefined || vista === "editar" ? "lugares" : vista;

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
  vista: z.enum(VISTAS_DE_URL).optional().catch(undefined),
  accion: z.enum(ACCIONES_DE_NODO).optional().catch(undefined),
  q: z
    .string()
    .trim()
    .max(LARGO_MAXIMO_DE_BUSQUEDA)
    .transform((texto) => texto || undefined)
    .optional()
    .catch(undefined),
  limite: z.coerce
    .number()
    .int()
    .positive()
    .max(LIMITE_MAXIMO)
    .optional()
    .catch(undefined),
  error: z.string().optional().catch(undefined),
  ok: z.enum(CLAVES_DE_CONFIRMACION).optional().catch(undefined),
  nuevo: z.uuid().optional().catch(undefined),
  regreso: esquemaDeRegreso.optional().catch(undefined),
  borrador: z.uuid().optional().catch(undefined),
});

/**
 * A que pestana pertenece cada accion, para no perder el contexto.
 *
 * Las tres del lugar -renombrar, mover y dar de baja- apuntan a la pestana
 * base: desde S3 de `odd/tasks/territorio-ux.md` su formulario vive en el
 * acordeon de la cabecera, y `vistaVisibleDeLugar` baja «lugares» a
 * Domicilios en una colonia. Asi un enlace guardado a `?vista=editar&
 * accion=baja` sigue abriendo la pantalla con su pliegue desplegado.
 */
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
  renombrar: "lugares",
  reparentear: "lugares",
  baja: "lugares",
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
    busqueda: datos.q,
    limite: datos.limite,
    nodoId: datos.nodo ? comoLugarId(datos.nodo) : undefined,
    accion,
    error: datos.error,
    // Un fallo y un exito juntos no pasan solos: el error gana, y la
    // pantalla no celebra una accion que el mismo URL dice que fallo.
    ok: datos.error ? undefined : datos.ok,
    nuevo: datos.nuevo ? comoLugarId(datos.nuevo) : undefined,
    // La accion fija su pestana; sin accion vale la elegida (o Lugares),
    // salvo con una calle abierta: su panel solo existe en Calles, asi que
    // un `?calle=` sin `?vista=` caia en Colonias y la calle no se abria
    // (C1 de `odd/tasks/territorio-ux.md`, S7).
    vista: accion
      ? pestanaDeAccion[accion]
      : datos.calle
        ? "calles"
        : vistaDe(datos.vista),
    regreso: datos.regreso,
    borrador: datos.borrador,
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
