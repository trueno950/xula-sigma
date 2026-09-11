import { and, eq } from "drizzle-orm";
import type { RepositorioDeIntervenciones } from "../application/puertos";
import { aIntervencionGuardada } from "./aIntervencionGuardada";
import { intervenciones, revisionesDeIntervenciones } from "./esquema";

export const repositorioDeIntervencionesSql: RepositorioDeIntervenciones = {
  async guardar(tx, datos) {
    await tx.insert(intervenciones).values(datos);
  },

  async buscarPorId(tx, id) {
    const [fila] = await tx
      .select()
      .from(intervenciones)
      .where(eq(intervenciones.id, id));

    return fila ? aIntervencionGuardada(fila) : null;
  },

  async corregir(tx, datos) {
    const [actual] = await tx
      .select()
      .from(intervenciones)
      .where(eq(intervenciones.id, datos.id))
      .for("update");
    if (!actual) return false;

    const filas = await tx
      .update(intervenciones)
      .set({ ...datos.cambios, actualizadoEn: new Date() })
      .where(eq(intervenciones.id, datos.id))
      .returning({ id: intervenciones.id });
    if (filas.length === 0) return false;

    await tx.insert(revisionesDeIntervenciones).values({
      ayuntamientoId: datos.ayuntamientoId,
      intervencionId: datos.id,
      valoresAnteriores: {
        tipo: actual.tipo,
        estado: actual.estado,
        fechaDeOcurrencia: actual.fechaDeOcurrencia,
        lugarId: actual.lugarId,
        calleId: actual.calleId,
        reporteId: actual.reporteId,
        descripcion: actual.descripcion,
      },
      usuarioId: datos.usuarioId,
    });
    return true;
  },

  async aplicarTransicion(tx, datos) {
    const filas = await tx
      .update(intervenciones)
      .set({ estado: datos.estadoNuevo, actualizadoEn: new Date() })
      .where(
        and(
          eq(intervenciones.id, datos.id),
          eq(intervenciones.estado, datos.estadoAnterior),
        ),
      )
      .returning({ id: intervenciones.id });

    return filas.length > 0;
  },
};
