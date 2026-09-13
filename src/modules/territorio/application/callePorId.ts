import type { ContextoActual } from "@/shared/auth/contexto";
import {
  type TransaccionTenant,
  withTenant,
} from "@/shared/tenancy/withTenant";
import type { CalleId } from "../domain";
import type {
  CalleConEventos,
  LectorDeCallesDeMapa,
} from "./puertosDeLecturaDeCalles";

/**
 * Sin guarda de rol: la linea de tiempo es lectura, no administracion. Una
 * calle de otro municipio es invisible bajo RLS y se traduce a `null`, sin
 * revelar que existe.
 */
export function crearCallePorId(lector: LectorDeCallesDeMapa) {
  const leerEnTransaccion = crearCallePorIdEnTransaccion(lector);

  return function callePorId(
    id: CalleId,
    contexto: ContextoActual,
  ): Promise<CalleConEventos | null> {
    return withTenant(contexto.ayuntamientoId, (tx) =>
      leerEnTransaccion(tx, id),
    );
  };
}

export function crearCallePorIdEnTransaccion(lector: LectorDeCallesDeMapa) {
  return function callePorIdEnTransaccion(
    tx: TransaccionTenant,
    id: CalleId,
  ): Promise<CalleConEventos | null> {
    return lector.leerConEventos(tx, id);
  };
}
