import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { LugarId } from "../domain";
import type {
  DetalleDeCalle,
  LectorDeDetallesDeCalles,
} from "./puertosDeDetallesDeCalles";

/**
 * Lo que la pestana Calles muestra de cada calle: su zona y sus domicilios.
 *
 * Sin guarda de rol a proposito, mismo criterio que `listarCalles`: leer el
 * catalogo que ya se lista no es escribirlo. Corre bajo `withTenant`, que es
 * lo que acota las tres tablas de la consulta al municipio del contexto.
 */
export function crearDetallesDeCalles(lector: LectorDeDetallesDeCalles) {
  return function detallesDeCalles(
    lugarId: LugarId,
    contexto: ContextoActual,
  ): Promise<readonly DetalleDeCalle[]> {
    return withTenant(contexto.ayuntamientoId, (tx) =>
      lector.detallesPorLugar(tx, lugarId),
    );
  };
}
