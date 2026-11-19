import {
  type CalleId,
  lecturasDeZonas,
  type NodoSeleccionado,
  type UsoDeCalle,
  usoDeCalle,
} from "@/modules/territorio";
import { leeZonasDelLugar } from "@/modules/territorio/ui/estadosDeEdicion";
import {
  permisosDeTerritorio,
  puedeAbrir,
} from "@/modules/territorio/ui/permisos";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import type { ParametrosDeTerritorio } from "./parametros";

type Entrada = {
  contexto: ContextoActual;
  parametros: Pick<ParametrosDeTerritorio, "calleId">;
  nodo: NodoSeleccionado | null;
};

/**
 * Mismo criterio que las cuentas de `cargaDeTerritorio.ts`: decidir que se
 * ofrece es decoracion. Si la lectura falla la accion se ofrece igual y
 * decide el caso de uso al enviar.
 */
const sinRomper = async <T>(
  que: string,
  leer: () => Promise<T>,
): Promise<T | null> => {
  try {
    return await leer();
  } catch (error) {
    if (error instanceof NoAutorizadoError) throw error;
    console.error(
      `[territorio] no se pudo leer ${que}`,
      datosSegurosDeError(error),
    );

    return null;
  }
};

const usoDeLaCalleAbierta = (
  { contexto }: Entrada,
  calleId: CalleId,
): Promise<UsoDeCalle | null> =>
  sinRomper("el uso de la calle", () => usoDeCalle(calleId, contexto));

const zonasDelNodo = async ({ contexto, nodo }: Entrada) => {
  if (!nodo || !leeZonasDelLugar(nodo)) return undefined;
  const zonas = await sinRomper("las zonas del lugar", () =>
    lecturasDeZonas.listarZonas(nodo.id, contexto),
  );

  return zonas?.length;
};

/**
 * Lo que frena una accion antes de ofrecerla: el uso de la calle abierta
 * (solo para quien puede moverla o darla de baja) y las zonas del lugar.
 */
export const cargarBloqueos = async (entrada: Entrada) => {
  const { calleId } = entrada.parametros;
  const permisos = permisosDeTerritorio(entrada.contexto.usuario.rol);
  const [uso, zonasDelLugar] = await Promise.all([
    calleId && puedeAbrir("bajaCalle", permisos)
      ? usoDeLaCalleAbierta(entrada, calleId)
      : undefined,
    // Decidir si la baja se ofrece es decoracion de la cabecera (S3 de
    // `territorio-ux`): a un rol que no puede darla de baja no se le leen.
    puedeAbrir("baja", permisos) ? zonasDelNodo(entrada) : undefined,
  ]);

  return { usoDeCalle: uso, zonasDelLugar };
};
