import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  limpiar,
  motivoDeFalla,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { type SemillasAuth, sembrarAuth } from "./datosDePrueba";
import { intentosAcceso, type TipoIntento } from "./intentosAcceso";

let semillas: SemillasAuth;

beforeAll(async () => {
  await sembrar();
  semillas = await sembrarAuth();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("aislamiento de intentos de acceso", () => {
  it("una consulta sin filtro solo devuelve los intentos del tenant activo", async () => {
    const filas = await withTenant(motul, (tx) =>
      tx.select().from(intentosAcceso),
    );

    expect(filas).toHaveLength(1);
    expect(filas[0]?.ayuntamientoId).toBe(motul);
    expect(filas[0]?.id).toBe(semillas.enMotul.intentoId);
  });

  it("los intentos de Ticul no cuentan en la ventana de Motul", async () => {
    /**
     * No es solo confidencialidad: si la ventana corrediza contara los
     * intentos del otro municipio, un atacante contra Ticul dejaria sin
     * acceso a la gente de Motul. El aislamiento aca tambien es
     * disponibilidad.
     */
    const filas = await withTenant(motul, (tx) =>
      tx
        .select()
        .from(intentosAcceso)
        .where(eq(intentosAcceso.clave, semillas.enTicul.clave)),
    );

    expect(filas).toHaveLength(0);
  });

  it("no se puede registrar un intento a nombre de otro municipio", async () => {
    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(intentosAcceso).values({
          ayuntamientoId: ticul,
          clave: "clave-infiltrada",
          tipo: "correo",
        }),
      ),
    );

    expect(motivo).toMatch(/row-level security/i);
  });

  it("un intento registrado no se puede modificar", async () => {
    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.execute(
          sql`UPDATE intentos_acceso SET tipo = 'ip' WHERE ayuntamiento_id = ${motul}`,
        ),
      ),
    );

    // Sin GRANT de UPDATE. Un intento se registra y se purga; reescribirlo
    // seria reescribir la evidencia de que alguien estuvo probando claves.
    expect(motivo).toMatch(/permission denied/i);
  });

  it("un tipo fuera del conjunto no entra, aunque se evada el tipo", async () => {
    // Un `"email"` en vez de `"correo"` abriria una tercera ventana que
    // nadie cuenta: el limitador dejaria de limitar sin que nada falle.
    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(intentosAcceso).values({
          ayuntamientoId: motul,
          clave: "clave-cualquiera",
          tipo: "email" as TipoIntento,
        }),
      ),
    );

    expect(motivo).toMatch(/intentos_acceso_tipo_valido/i);
  });
});
