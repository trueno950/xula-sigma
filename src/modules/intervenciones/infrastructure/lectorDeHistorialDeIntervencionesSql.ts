import { asc, eq } from "drizzle-orm";
import { usuarios } from "@/shared/auth/esquema";
import type { LectorDeHistorialDeIntervenciones } from "../application/puertosDeHistorial";
import { revisionesDeIntervenciones } from "./esquema";

/**
 * Las revisiones de una intervencion con el nombre y el rol de quien las
 * hizo, y quien la registro (S11 y S14 de `intervenciones-ux`).
 *
 * `usuarios` no es una tabla de otro modulo sino la de `shared/auth`, y el
 * `innerJoin` por `id` corre bajo el `withTenant` que abrio el caso de uso,
 * asi que RLS decide si el usuario es de este municipio: una revision no
 * puede quedar con el nombre de otra persona.
 *
 * `orderBy` ascendente por momento es contrato del puerto: el caso de uso
 * compara cada revision con la siguiente para saber que valor quedo escrito.
 * El `id` desempata dos revisiones del mismo milisegundo.
 */
export const lectorDeHistorialDeIntervencionesSql: LectorDeHistorialDeIntervenciones =
  {
    async leer(tx, { intervencionId, registradoPorUsuarioId }) {
      const filas = await tx
        .select({
          id: revisionesDeIntervenciones.id,
          valoresAnteriores: revisionesDeIntervenciones.valoresAnteriores,
          ocurridoEn: revisionesDeIntervenciones.ocurridoEn,
          autorNombre: usuarios.name,
          autorRol: usuarios.rol,
        })
        .from(revisionesDeIntervenciones)
        .innerJoin(
          usuarios,
          eq(usuarios.id, revisionesDeIntervenciones.usuarioId),
        )
        .where(eq(revisionesDeIntervenciones.intervencionId, intervencionId))
        .orderBy(
          asc(revisionesDeIntervenciones.ocurridoEn),
          asc(revisionesDeIntervenciones.id),
        );

      const [registro] = await tx
        .select({ nombre: usuarios.name, rol: usuarios.rol })
        .from(usuarios)
        .where(eq(usuarios.id, registradoPorUsuarioId));

      return {
        revisiones: filas.map((fila) => ({
          id: fila.id,
          valoresAnteriores: fila.valoresAnteriores,
          ocurridoEn: fila.ocurridoEn,
          autor: { nombre: fila.autorNombre, rol: fila.autorRol },
        })),
        registradaPor: registro
          ? { nombre: registro.nombre, rol: registro.rol }
          : null,
      };
    },
  };
