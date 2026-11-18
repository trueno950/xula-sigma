import { z } from "zod";
import {
  type CandidatoAFusionar,
  comoPersonaId,
  nombreCompletoDe,
  PESTANA_POR_DEFECTO,
  PESTANAS_DE_FICHA,
  type PestanaDeFicha,
  personaPorId,
  sugerirDuplicados,
} from "@/modules/padron";
import type { ContextoActual } from "@/shared/auth";
import { puedeFusionarPersonas } from "@/shared/auth/roles";

export type ParametrosDeFicha = {
  error?: string | undefined;
  /** `ok` y `domicilio` solo los pone el alta de domicilio abierta desde esta ficha. */
  ok?: "domicilio-creado" | undefined;
  domicilio?: string | undefined;
  /** L7: la sección visible, con su estado en la URL. */
  pestana: PestanaDeFicha;
};

/**
 * Cada campo cae a `undefined` por su cuenta -`.catch()`, no un
 * `.safeParse()` de todo el objeto-, mismo criterio que
 * `mapa-operativo/parametros.ts`: un `?pestana=` inválido no debe tirar el
 * `?error=` que la Server Action acaba de escribir.
 */
const esquemaDeParametros = z.object({
  error: z.string().optional().catch(undefined),
  ok: z.literal("domicilio-creado").optional().catch(undefined),
  domicilio: z.uuid().optional().catch(undefined),
  pestana: z.enum(PESTANAS_DE_FICHA).optional().catch(undefined),
});

const esquemaDeId = z.string().uuid();

export const leerParametrosDeFicha = (
  searchParams: Record<string, string | string[] | undefined>,
): ParametrosDeFicha => {
  // Cada campo ya cae solo con `.catch()`: este parse no falla.
  const datos = esquemaDeParametros.parse(searchParams);
  return {
    error: datos.error,
    ok: datos.ok,
    domicilio: datos.domicilio,
    pestana: datos.pestana ?? PESTANA_POR_DEFECTO,
  };
};

/**
 * La persona que pide la URL. El formato se valida con Zod, no con un
 * `try/catch` alrededor de `personaPorId` (hallazgo de GGA en la revision de
 * esta rebanada): un `catch` amplio ahi tragaria tambien un fallo real de
 * infraestructura -conexion caida, timeout- y lo mostraria igual que un id
 * inexistente, sin log y sin propagar el error.
 *
 * Un id de otro municipio ya vuelve `null` por RLS, indistinguible de uno
 * inexistente: los dos son 404 (regla 8).
 */
export const leerPersona = async (id: string, contexto: ContextoActual) => {
  const analisis = esquemaDeId.safeParse(id);
  if (!analisis.success) return null;

  return personaPorId(comoPersonaId(analisis.data), contexto);
};

/**
 * S11: la residencia vigente sale del historial que la pagina ya lee -la
 * primera fila con `hastaEn` null, el mismo criterio que `vigenteDe` del
 * dominio de `territorio`-, nunca de una lectura nueva. `texto` es `null`
 * cuando la direccion ya no se puede leer.
 */
export const domicilioVigenteDe = (
  historial: readonly { texto: string | null; hastaEn: string | null }[],
): string | null =>
  historial.find((residencia) => residencia.hastaEn === null)?.texto ?? null;

type BusquedaDeCandidatos = {
  pestana: PestanaDeFicha;
  /** El nombre completo: es lo que la operadora reconoce de la duplicada. */
  nombre: string;
  personaId: string;
  contexto: ContextoActual;
};

/**
 * S12: las personas parecidas se piden solo cuando el pliegue de la fusion
 * se va a pintar -permiso de fusion y pestana de Administrar-, para no pagar
 * una consulta en la seccion que solo se lee. La propia ficha se excluye:
 * fusionarse consigo misma no es una fusion.
 */
export const candidatosAFusionar = async ({
  pestana,
  nombre,
  personaId,
  contexto,
}: BusquedaDeCandidatos): Promise<readonly CandidatoAFusionar[]> => {
  if (pestana !== "administrar") return [];
  if (!puedeFusionarPersonas(contexto.usuario.rol)) return [];

  const parecidas = await sugerirDuplicados(nombre, contexto);

  return parecidas
    .filter((parecida) => parecida.id !== personaId)
    .map((parecida) => ({
      id: parecida.id,
      etiqueta: `${nombreCompletoDe(parecida)} · ${parecida.curp ?? "Sin CURP"}`,
    }));
};
