import { z } from "zod";
import type {
  AccionDeNodo,
  NodoSeleccionado,
  TabDeLugar,
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
  raizId: string | undefined;
  nodoId: string | undefined;
  accion: AccionDeNodo | undefined;
  error: string | undefined;
  vista: TabDeLugar;
};

const esquemaDeParametros = z.object({
  raiz: z.string().uuid().optional(),
  nodo: z.string().uuid().optional(),
  vista: z.enum(["lugares", "calles", "domicilios", "editar"]).optional(),
  accion: z
    .enum([
      "lugar",
      "calle",
      "renombrarCalle",
      "domicilio",
      "renombrar",
      "baja",
      "reparentear",
    ])
    .optional(),
  error: z.string().optional(),
});

/** A que pestana pertenece cada accion, para no perder el contexto. */
const pestanaDeAccion: Record<AccionDeNodo, TabDeLugar> = {
  lugar: "lugares",
  calle: "calles",
  renombrarCalle: "calles",
  domicilio: "domicilios",
  renombrar: "editar",
  reparentear: "editar",
  baja: "editar",
};

export const leerParametros = (
  searchParams: Record<string, string | string[] | undefined>,
): ParametrosDeTerritorio => {
  const analisis = esquemaDeParametros.safeParse(searchParams);

  if (!analisis.success) {
    return {
      raizId: undefined,
      nodoId: undefined,
      accion: undefined,
      error: undefined,
      vista: "lugares",
    };
  }

  const accion = analisis.data.accion as AccionDeNodo | undefined;

  return {
    raizId: analisis.data.raiz,
    nodoId: analisis.data.nodo,
    accion,
    error: analisis.data.error,
    // La accion fija su pestana; sin accion vale la elegida (o Lugares).
    vista: accion
      ? pestanaDeAccion[accion]
      : (analisis.data.vista ?? "lugares"),
  };
};

export const nodoResuelto = ({
  raiz,
  nodos,
  nodoId,
}: {
  raiz: NodoSeleccionado | null;
  nodos: readonly NodoDeSubarbol[];
  nodoId: string | undefined;
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
