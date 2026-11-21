import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError } from "@/shared/lib/errores";
import { comoAyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import type { PorcionExportable } from "./agregarPorciones";

/**
 * El inventario de S10 y S11: la lista de conjuntos y sus conteos.
 *
 * Se prueba sin Postgres -`withTenant` y la transaccion van fabricados, mismo
 * patron que `porcionesDeTerritorio` en `composicion.test.ts`- porque lo que
 * decide este archivo es la lista y el armado, no RLS: eso lo cubre
 * `inventarioDeExportacion.isolation.test.ts` contra la base real.
 */

const withTenantMock = vi.hoisted(() => vi.fn());
const txDePrueba = vi.hoisted(() => ({
  select: vi.fn(),
  execute: vi.fn(),
}));

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { nombresDeConjuntos, inventarioDeAyuntamiento } = await import(
  "./inventario"
);

const contexto = (rol: ContextoActual["usuario"]["rol"]): ContextoActual => ({
  ayuntamientoId: comoAyuntamientoId("11111111-1111-4111-8111-111111111111"),
  usuario: { id: "usuario-1", rol },
  origen: "https://motul.xulasigma.mx",
});

const porcion = (nombre: string): PorcionExportable => ({
  nombre,
  leer: async () => [],
});

const AHORA = new Date("2026-11-21T15:00:00.000Z");

const conMunicipio = (marca: Record<string, unknown> = {}, filas = 7) => {
  const where = vi.fn().mockResolvedValue([{ subdominio: "motul", marca }]);
  txDePrueba.select.mockReturnValue({
    from: vi.fn().mockReturnValue({ where }),
  });
  txDePrueba.execute.mockResolvedValue([{ filas }]);

  return { where };
};

beforeEach(() => {
  vi.clearAllMocks();
  withTenantMock.mockImplementation(
    async (_id: string, trabajo: (tx: unknown) => Promise<unknown>) =>
      trabajo(txDePrueba),
  );
});

describe("nombresDeConjuntos", () => {
  it("empieza por los dos conjuntos de la plataforma y sigue el orden de las porciones", () => {
    expect(
      nombresDeConjuntos([porcion("personas"), porcion("lugares")]),
    ).toEqual(["usuarios", "bitacora", "personas", "lugares"]);
  });

  it("sin porciones son solo los de la plataforma", () => {
    expect(nombresDeConjuntos([])).toEqual(["usuarios", "bitacora"]);
  });
});

describe("inventarioDeAyuntamiento", () => {
  it("un rol sin permiso no lee la base", async () => {
    await expect(
      inventarioDeAyuntamiento(
        contexto("OPERADOR"),
        [porcion("personas")],
        AHORA,
      ),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(withTenantMock).not.toHaveBeenCalled();
  });

  it("lee bajo el tenant de la sesion y no de otro", async () => {
    conMunicipio();

    await inventarioDeAyuntamiento(
      contexto("ADMIN_MUNICIPAL"),
      [porcion("personas")],
      AHORA,
    );

    expect(withTenantMock).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      expect.any(Function),
    );
  });

  it("nombra el archivo con el subdominio del municipio y el dia en Merida", async () => {
    conMunicipio();

    const inventario = await inventarioDeAyuntamiento(
      contexto("ADMIN_MUNICIPAL"),
      [porcion("personas")],
      AHORA,
    );

    expect(inventario.archivo).toBe("motul-2026-11-21.zip");
  });

  it("dice si el municipio tiene escudo, porque el ZIP lo agrega solo si lo tiene", async () => {
    conMunicipio({ primario: "#7a1f2b", escudo: "https://assets/x.png" });
    const conEscudo = await inventarioDeAyuntamiento(
      contexto("ADMIN_MUNICIPAL"),
      [],
      AHORA,
    );

    conMunicipio({ primario: "#7a1f2b" });
    const sinEscudo = await inventarioDeAyuntamiento(
      contexto("ADMIN_MUNICIPAL"),
      [],
      AHORA,
    );

    expect(conEscudo.tieneEscudo).toBe(true);
    expect(sinEscudo.tieneEscudo).toBe(false);
  });

  it("cuenta una vez cada conjunto, en el orden de la lista", async () => {
    conMunicipio();

    const inventario = await inventarioDeAyuntamiento(
      contexto("ADMIN_MUNICIPAL"),
      [porcion("personas"), porcion("lugares")],
      AHORA,
    );

    expect(txDePrueba.execute).toHaveBeenCalledTimes(4);
    expect(inventario.conjuntos.map((conjunto) => conjunto.nombre)).toEqual([
      "usuarios",
      "bitacora",
      "personas",
      "lugares",
    ]);
    expect(inventario.conjuntos.every((conjunto) => conjunto.filas === 7)).toBe(
      true,
    );
  });

  /**
   * `count(*)` en Postgres vuelve como texto; `::int` lo castea, pero el
   * numero que se pinta no puede depender de eso.
   */
  it("un conteo que llega como texto se pinta como numero", async () => {
    conMunicipio({}, "3" as unknown as number);

    const inventario = await inventarioDeAyuntamiento(
      contexto("ADMIN_MUNICIPAL"),
      [],
      AHORA,
    );

    expect(inventario.conjuntos[0]?.filas).toBe(3);
  });
});
