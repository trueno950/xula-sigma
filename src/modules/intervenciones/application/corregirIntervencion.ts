import { z } from "zod";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeAdministrarIntervenciones } from "@/shared/auth/roles";
import {
  NoAutorizadoError,
  NoEncontradoError,
  ValidacionError,
} from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import { comoIntervencionId, TIPOS_DE_INTERVENCION } from "../domain";
import type { RepositorioDeIntervenciones } from "./puertos";
import type { LecturaDeUbicaciones } from "./puertosDeLectura";

const esquemaDeEntrada = z.strictObject({
  id: z.string().trim().uuid(),
  tipo: z.enum(TIPOS_DE_INTERVENCION),
  fechaDeOcurrencia: z.iso.date(),
  lugarId: z.string().trim().uuid(),
  calleId: z.string().trim().uuid().nullable(),
  reporteId: z.string().trim().uuid().nullable(),
  descripcion: z.string().trim().min(10).max(1000),
});

export type EntradaDeCorreccionDeIntervencion = z.infer<
  typeof esquemaDeEntrada
>;

type RegistrarDeBitacora = (...args: Parameters<typeof registrar>) => unknown;

const validarEntrada = (datos: unknown): EntradaDeCorreccionDeIntervencion => {
  const resultado = esquemaDeEntrada.safeParse(datos);
  if (resultado.success) return resultado.data;

  throw new ValidacionError();
};

export function crearCorregirIntervencion({
  repositorio,
  crearLecturaDeUbicaciones,
  registrarBitacora = registrar,
}: {
  repositorio: Pick<RepositorioDeIntervenciones, "corregir">;
  crearLecturaDeUbicaciones: () => LecturaDeUbicaciones;
  registrarBitacora?: RegistrarDeBitacora;
}) {
  return async function corregirIntervencion(
    datos: unknown,
    contexto: ContextoActual,
  ) {
    if (!puedeAdministrarIntervenciones(contexto.usuario.rol)) {
      throw new NoAutorizadoError();
    }

    const entrada = validarEntrada(datos);
    const { id, ...cambios } = entrada;
    await withTenant(contexto.ayuntamientoId, async (tx) => {
      const ubicacion = await crearLecturaDeUbicaciones().de(
        tx,
        entrada.lugarId,
        entrada.calleId,
      );
      if (!ubicacion) throw new NoEncontradoError();

      const corregida = await repositorio.corregir(tx, {
        id: comoIntervencionId(id),
        ayuntamientoId: contexto.ayuntamientoId,
        usuarioId: contexto.usuario.id,
        cambios,
      });
      if (!corregida) throw new NoEncontradoError();

      await registrarBitacora(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "CORREGIR_INTERVENCION",
        entidad: "intervenciones",
        entidadId: id,
      });
    });
  };
}
