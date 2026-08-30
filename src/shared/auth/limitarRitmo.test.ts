import { describe, expect, it, vi } from "vitest";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { limitarRitmo, limitarRitmoDeAcceso } = await import("./limitarRitmo");
const { claveDe } = await import("./ritmo");

const MOTUL = "11111111-1111-1111-1111-111111111111" as AyuntamientoId;

/**
 * `tx` fabricado a mano, mismo patron que `contadorDeFoliosSql.test.ts`:
 * alcanza con la parte de la cadena de Drizzle que `limitarRitmo` realmente
 * usa. La ventana corrediza contra Postgres de verdad la cubre
 * `ritmo.isolation.test.ts`; esto es "sin Postgres" (design.md de
 * `constancias-oficios`, seccion 12): la forma nueva -un arreglo de
 * `{tipo, valor}` en vez de `{correo, ip}`- y que `limitarRitmoDeAcceso`
 * siga armando las mismas ventanas que antes.
 */
const txDeRitmo = (conteo = 0) => {
  const where = vi.fn().mockResolvedValue([{ conteo }]);
  const from = vi.fn().mockReturnValue({ where });
  const select = vi.fn().mockReturnValue({ from });
  const values = vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn().mockReturnValue({ values });

  return {
    tx: { select, insert } as unknown as TransaccionTenant,
    values,
  };
};

describe("limitarRitmo, el nucleo generalizado", () => {
  it("recibe un arreglo de {tipo, valor} en vez de {correo, ip}", async () => {
    const { tx, values } = txDeRitmo();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (t: unknown) => unknown) => trabajo(tx),
    );

    await limitarRitmo(MOTUL, [{ tipo: "folio", valor: "9.9.9.9" }]);

    expect(values).toHaveBeenCalledWith([
      { ayuntamientoId: MOTUL, clave: claveDe("9.9.9.9"), tipo: "folio" },
    ]);
  });
});

describe("limitarRitmoDeAcceso, el envoltorio delgado", () => {
  it("correo ausente: sin esa ventana, la de ip siempre presente", async () => {
    const { tx, values } = txDeRitmo();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (t: unknown) => unknown) => trabajo(tx),
    );

    await limitarRitmoDeAcceso(MOTUL, { correo: null, ip: "189.203.10.7" });

    expect(values).toHaveBeenCalledWith([
      { ayuntamientoId: MOTUL, clave: claveDe("189.203.10.7"), tipo: "ip" },
    ]);
  });

  it("correo presente: arma las dos ventanas de siempre", async () => {
    const { tx, values } = txDeRitmo();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (t: unknown) => unknown) => trabajo(tx),
    );

    await limitarRitmoDeAcceso(MOTUL, {
      correo: "tesoreria@example.com",
      ip: "189.203.10.7",
    });

    expect(values).toHaveBeenCalledWith([
      {
        ayuntamientoId: MOTUL,
        clave: claveDe("tesoreria@example.com"),
        tipo: "correo",
      },
      { ayuntamientoId: MOTUL, clave: claveDe("189.203.10.7"), tipo: "ip" },
    ]);
  });
});
