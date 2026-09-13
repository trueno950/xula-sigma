import { sql } from "drizzle-orm";
import { z } from "zod";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { canalDeTenant } from "./canales";

/**
 * El payload de una actualizacion estructural de calle, cerrado y exacto.
 *
 * `strictObject` es el contrato: la spec de `territorio` prohibe que viajen
 * naturaleza, nombre, coordenadas, descripcion, referencia o datos de otro
 * tenant. El consumidor rehidrata bajo RLS con `callesParaMapa` o
 * `callePorId` (design.md D6).
 */
export const esquemaDePayloadDeCalle = z.strictObject({
  tipo: z.literal("calle"),
  id: z.uuid(),
  cambio: z.literal("estructura"),
});

export type PayloadDeCalle = z.infer<typeof esquemaDePayloadDeCalle>;

/**
 * Publica una actualizacion en el canal del tenant **dentro de la
 * transaccion del llamador**.
 *
 * `pg_notify` es transaccional en Postgres: la entrega ocurre al COMMIT y
 * una transaccion revertida no notifica (design.md D3). Por eso el `tx` es
 * obligatorio y no hay variante que abra conexion propia; el canal se
 * deriva del `ayuntamientoId` del servidor, nunca de un parametro del
 * cliente.
 */
export async function publicarActualizacion(
  tx: TransaccionTenant,
  ayuntamientoId: AyuntamientoId,
  payload: PayloadDeCalle,
): Promise<void> {
  const validado = esquemaDePayloadDeCalle.parse(payload);
  const canal = canalDeTenant(ayuntamientoId);
  const cuerpo = JSON.stringify(validado);

  await tx.execute(sql`SELECT pg_notify(${canal}, ${cuerpo})`);
}
