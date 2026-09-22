import type { LectorDeIntervencionesDeMapa } from "../application/puertosDeLectura";
import { intervenciones } from "./esquema";

export const lectorDeIntervencionesDeMapaSql: LectorDeIntervencionesDeMapa = {
  listarParaMapa(tx) {
    return tx
      .select({
        id: intervenciones.id,
        tipo: intervenciones.tipo,
        estado: intervenciones.estado,
        calleId: intervenciones.calleId,
        lugarId: intervenciones.lugarId,
      })
      .from(intervenciones);
  },
};
