import { z } from "zod";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeAdministrarIntervenciones } from "@/shared/auth/roles";
import {
  NoAutorizadoError,
  NoEncontradoError,
  ValidacionError,
} from "@/shared/lib/errores";
import { publicarActualizacion } from "@/shared/notificaciones/notificar";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  comoIntervencionId,
  ESTADOS_DE_INTERVENCION,
  esTerminal,
  IntervencionCerradaError,
  TransicionInvalidaError,
  transicionValida,
} from "../domain";
import type { RepositorioDeIntervenciones } from "./puertos";

const esquemaDeEntrada = z.strictObject({
  id: z.string().trim().uuid(),
  estadoNuevo: z.enum(ESTADOS_DE_INTERVENCION),
});

const validarEntrada = (datos: unknown) => {
  const resultado = esquemaDeEntrada.safeParse(datos);
  if (resultado.success) return resultado.data;
  throw new ValidacionError();
};

export function crearCambiarEstadoDeIntervencion({
  repositorio,
}: {
  repositorio: Pick<
    RepositorioDeIntervenciones,
    "buscarPorId" | "aplicarTransicion"
  >;
}) {
  return async function cambiarEstadoDeIntervencion(
    datos: unknown,
    contexto: ContextoActual,
  ): Promise<void> {
    if (!puedeAdministrarIntervenciones(contexto.usuario.rol)) {
      throw new NoAutorizadoError();
    }

    const entrada = validarEntrada(datos);
    const id = comoIntervencionId(entrada.id);
    await withTenant(contexto.ayuntamientoId, async (tx) => {
      const actual = await repositorio.buscarPorId(tx, id);
      if (!actual) throw new NoEncontradoError();

      const estadoActual = actual.estado;
      if (esTerminal(estadoActual)) throw new IntervencionCerradaError();
      if (!transicionValida(estadoActual, entrada.estadoNuevo)) {
        throw new TransicionInvalidaError();
      }
      const aplicada = await repositorio.aplicarTransicion(tx, {
        id,
        estadoAnterior: actual.estado,
        estadoNuevo: entrada.estadoNuevo,
      });
      if (!aplicada) throw new NoEncontradoError();

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "CAMBIAR_ESTADO_INTERVENCION",
        entidad: "intervenciones",
        entidadId: entrada.id,
      });

      await publicarActualizacion(tx, contexto.ayuntamientoId, {
        tipo: "intervencion",
        id: entrada.id,
        cambio: "estado",
      });
    });
  };
}
