import { z } from "zod";
import {
  comoLugarId,
  comoZonaId,
  type LugarId,
  type ZonaId,
} from "@/modules/territorio";
import { CLAVES_DE_CONFIRMACION_DE_ZONAS } from "@/modules/territorio/ui/actions/navegacionDeZonas";

/**
 * La lectura de `?zona=&raiz=&vista=&error=&ok=` de /territorio/zonas.
 *
 * A diferencia de `territorio/parametros.ts`, un `?zona` o `?raiz` presente
 * pero invalido es 404 y no se ignora en silencio (B3u-RED-01): en zonas no
 * hay pantalla de listado a la que caer "por defecto" cuando el operador
 * ya eligio una zona concreta de la URL.
 */
export type ParametrosDeZonas = {
  zonaId: ZonaId | undefined;
  raizId: LugarId | undefined;
  vista: "calles" | "domicilios";
  error: string | undefined;
  ok: (typeof CLAVES_DE_CONFIRMACION_DE_ZONAS)[number] | undefined;
  invalido: boolean;
};

const uuid = z.string().uuid();

/** "ausente" | "invalido" | el uuid valido. */
const comoUuid = (
  valor: string | string[] | undefined,
): { estado: "ausente" | "invalido" } | { estado: "ok"; id: string } => {
  if (valor === undefined) return { estado: "ausente" };
  if (Array.isArray(valor)) return { estado: "invalido" };
  const parseado = uuid.safeParse(valor);
  return parseado.success
    ? { estado: "ok", id: parseado.data }
    : { estado: "invalido" };
};

const claveDeConfirmacion = z
  .enum(CLAVES_DE_CONFIRMACION_DE_ZONAS)
  .optional()
  .catch(undefined);

export const leerParametros = (
  searchParams: Record<string, string | string[] | undefined>,
): ParametrosDeZonas => {
  const zona = comoUuid(searchParams.zona);
  const raiz = comoUuid(searchParams.raiz);
  const vista = searchParams.vista === "domicilios" ? "domicilios" : "calles";
  const error =
    typeof searchParams.error === "string" ? searchParams.error : undefined;

  return {
    zonaId: zona.estado === "ok" ? comoZonaId(zona.id) : undefined,
    raizId: raiz.estado === "ok" ? comoLugarId(raiz.id) : undefined,
    vista,
    error,
    // Un fallo y un exito juntos no pasan solos: el error gana.
    ok: error ? undefined : claveDeConfirmacion.parse(searchParams.ok),
    invalido: zona.estado === "invalido" || raiz.estado === "invalido",
  };
};
