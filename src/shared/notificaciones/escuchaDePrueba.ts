import postgres from "postgres";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { canalDeTenant } from "./canales";

/**
 * LISTEN real para los tests de publicacion.
 *
 * Es andamiaje de prueba (regla 2 de `AGENTS.md`): `postgres` directo y una
 * conexion propia que en produccion no existe. El hub y su LISTEN son U7;
 * aca la conexion cruda es justamente lo que se prueba: que Postgres
 * entregue -o no- el NOTIFY que emitio la transaccion.
 */
export type EscuchaDePrueba = {
  esperar: (timeoutMs?: number) => Promise<string>;
  esperarSilencio: (timeoutMs?: number) => Promise<void>;
  cerrar: () => Promise<void>;
};

const esperarMs = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function abrirEscucha(
  ayuntamientoId: AyuntamientoId,
): Promise<EscuchaDePrueba> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL.");

  const cliente = postgres(url, { max: 1, prepare: false });
  const recibidos: string[] = [];

  await cliente.listen(canalDeTenant(ayuntamientoId), (payload) => {
    recibidos.push(payload);
  });

  const esperar = async (timeoutMs = 3000): Promise<string> => {
    const limite = Date.now() + timeoutMs;

    while (Date.now() < limite) {
      const siguiente = recibidos.shift();
      if (siguiente !== undefined) return siguiente;
      await esperarMs(25);
    }

    throw new Error("No llego la notificacion esperada.");
  };

  const esperarSilencio = async (timeoutMs = 400): Promise<void> => {
    await esperarMs(timeoutMs);

    if (recibidos.length > 0) {
      throw new Error(
        `Llego una notificacion inesperada: ${recibidos.join(", ")}`,
      );
    }
  };

  return { esperar, esperarSilencio, cerrar: () => cliente.end() };
}
