import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registrar } from "./bitacora";
import { bitacora } from "./esquema";
import {
  appSinTenant,
  limpiar,
  motivoDeFalla,
  motul,
  owner,
  sembrar,
  ticul,
} from "./municipiosDePrueba";
import { cerrarConexion, withTenant } from "./withTenant";

/**
 * La puerta unica de la bitacora de auditoria.
 *
 * `registrar` no agrega logica sobre el INSERT, y por eso lo que hay que
 * provocar no es que escriba: es que la fila que escribe siga cayendo del
 * lado correcto de RLS, y que no exista forma de escribir una traza a la
 * que le falte quien la origino o desde donde.
 */

beforeAll(sembrar);

afterAll(async () => {
  await limpiar();
  await owner.end();
  await appSinTenant.end();
  await cerrarConexion();
});

const trazasDe = (accion: string) =>
  withTenant(motul, (tx) =>
    tx.select().from(bitacora).where(eq(bitacora.accion, accion)),
  );

describe("registrar", () => {
  it("la traza de un municipio no se ve desde el otro", async () => {
    await withTenant(motul, (tx) =>
      registrar(tx, {
        ayuntamientoId: motul,
        actor: null,
        origen: "https://motul.xulasigma.mx",
        accion: "PRUEBA_AISLAMIENTO",
        entidad: "usuarios",
      }),
    );

    // Sin `where` de tenant en ninguna de las dos consultas. Si el
    // aislamiento dependiera de acordarse de filtrar, no seria aislamiento.
    const desdeTicul = await withTenant(ticul, (tx) =>
      tx
        .select()
        .from(bitacora)
        .where(eq(bitacora.accion, "PRUEBA_AISLAMIENTO")),
    );

    expect(await trazasDe("PRUEBA_AISLAMIENTO")).toHaveLength(1);
    expect(desdeTicul).toHaveLength(0);
  });

  it("escribe el origen de la peticion", async () => {
    // Por que la columna estuvo vacia hasta ahora: `ContextoActual.origen`,
    // en `shared/auth/contexto.ts`. Aca solo se sostiene que no vuelva.
    await withTenant(motul, (tx) =>
      registrar(tx, {
        ayuntamientoId: motul,
        actor: null,
        origen: "https://motul.xulasigma.mx",
        accion: "PRUEBA_ORIGEN",
        entidad: "usuarios",
      }),
    );

    const [traza] = await trazasDe("PRUEBA_ORIGEN");

    expect(traza?.origen).toBe("https://motul.xulasigma.mx");
  });

  it("acepta actor nulo, que es lo que origina el sistema", async () => {
    // Nulo explicito y no ausente: el tipo obliga a decidirlo. Una traza
    // sin actor es una decision, no un olvido.
    await withTenant(motul, (tx) =>
      registrar(tx, {
        ayuntamientoId: motul,
        actor: null,
        origen: null,
        accion: "PRUEBA_SISTEMA",
        entidad: "ayuntamientos",
      }),
    );

    const [traza] = await trazasDe("PRUEBA_SISTEMA");

    expect(traza?.actor).toBeNull();
  });

  it("no puede escribir una traza en el municipio de al lado", async () => {
    /**
     * El escenario que importa: el `ayuntamientoId` de la traza es un
     * parametro, asi que nada en TypeScript impide pasarle el de otro
     * municipio. Lo que lo impide es la politica, y esto lo provoca.
     */
    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        registrar(tx, {
          ayuntamientoId: ticul,
          actor: null,
          origen: null,
          accion: "PRUEBA_CRUZADA",
          entidad: "usuarios",
        }),
      ),
    );

    expect(motivo).toMatch(/row-level security/i);
  });
});
