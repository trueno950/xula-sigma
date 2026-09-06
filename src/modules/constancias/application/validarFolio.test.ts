import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { NO_VALIDO } from "../domain";
import type { FilaParaValidar, RepositorioDeConstancias } from "./puertos";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearValidarFolio } = await import("./validarFolio");

/**
 * La uniformidad probada en los cuatro casos negativos, con `toBe` -no
 * `toEqual`- mismo criterio que `domain/validacion.test.ts` (design.md de
 * `constancias-oficios`, seccion 8). Si algun camino devolviera un literal
 * copiado en vez de la referencia `NO_VALIDO`, `toEqual` seguiria pasando y
 * `toBe` es lo unico que lo atrapa.
 */

const MOTUL = "11111111-1111-1111-1111-111111111111" as AyuntamientoId;

const FILA: FilaParaValidar = {
  tipo: "VECINDAD",
  emitidaEn: new Date("2026-01-15T10:00:00.000Z"),
  canceladaEn: null,
  codigoVerificacion: "a1b2c3d4e5f60718",
  datos: {
    titular: { nombreCompleto: "Juan Poot" },
    direccion: {
      texto: "Calle 10, Motul",
      residenciaId: "residencia-1",
      desdeEn: "2020-01-01",
    },
    firmante: { nombre: "Maria Poot", cargo: "Secretaria Municipal" },
  },
};

const repositorioCon = (
  fila: FilaParaValidar | null,
): RepositorioDeConstancias => ({
  guardar: vi.fn(),
  buscarPorId: vi.fn(),
  bloquearPorId: vi.fn(),
  listar: vi.fn(),
  buscar: vi.fn(),
  paraValidar: vi.fn().mockResolvedValue(fila),
  registrarReimpresion: vi.fn(),
  existeReimpresion: vi.fn(),
  cancelar: vi.fn(),
});

beforeEach(() => {
  vi.clearAllMocks();
  withTenantMock.mockImplementation(
    (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
  );
});

describe("validarFolio: uniformidad de la respuesta", () => {
  it("folio inexistente: null del repositorio -> NO_VALIDO, la misma referencia", async () => {
    const validarFolio = crearValidarFolio(repositorioCon(null));

    const resultado = await validarFolio({
      ayuntamientoId: MOTUL,
      folio: "VEC-2026-000099",
      codigo: null,
    });

    expect(resultado).toBe(NO_VALIDO);
  });

  it("folio de otro tenant: RLS lo colapsa al mismo null -> NO_VALIDO, la misma referencia", async () => {
    /**
     * No hay una rama distinta para "de otro tenant": `paraValidar` corre
     * DENTRO de `withTenant`, y RLS deja la fila de otro municipio como el
     * mismo `null` que un folio que no existe. Este caso de uso no puede
     * distinguir uno del otro -ni falta que le haga-, y el test lo deja
     * escrito comparando la misma constante que el caso anterior.
     */
    const validarFolio = crearValidarFolio(repositorioCon(null));

    const resultado = await validarFolio({
      ayuntamientoId: MOTUL,
      folio: "VEC-2026-000001",
      codigo: null,
    });

    expect(resultado).toBe(NO_VALIDO);
  });

  it("codigo incorrecto -> NO_VALIDO", async () => {
    const validarFolio = crearValidarFolio(repositorioCon(FILA));

    const resultado = await validarFolio({
      ayuntamientoId: MOTUL,
      folio: "VEC-2026-000001",
      codigo: "codigo-equivocado",
    });

    expect(resultado).toBe(NO_VALIDO);
  });

  it("documento cancelado, con codigo correcto -> NO_VALIDO", async () => {
    const validarFolio = crearValidarFolio(
      repositorioCon({
        ...FILA,
        canceladaEn: new Date("2026-02-01T00:00:00.000Z"),
      }),
    );

    const resultado = await validarFolio({
      ayuntamientoId: MOTUL,
      folio: "VEC-2026-000001",
      codigo: FILA.codigoVerificacion,
    });

    expect(resultado).toBe(NO_VALIDO);
  });

  it("sin codigo, folio vigente: nivel 1, sin titular ni direccion", async () => {
    const validarFolio = crearValidarFolio(repositorioCon(FILA));

    const resultado = await validarFolio({
      ayuntamientoId: MOTUL,
      folio: "VEC-2026-000001",
      codigo: null,
    });

    expect(resultado).toEqual({
      estado: "VIGENTE",
      tipo: "VECINDAD",
      emitidaEn: FILA.emitidaEn.toISOString(),
    });
    expect(resultado).not.toHaveProperty("titular");
    expect(resultado).not.toHaveProperty("direccion");
  });

  it("con codigo correcto: nivel 2, con titular y direccion congelados del snapshot", async () => {
    const validarFolio = crearValidarFolio(repositorioCon(FILA));

    const resultado = await validarFolio({
      ayuntamientoId: MOTUL,
      folio: "VEC-2026-000001",
      codigo: FILA.codigoVerificacion,
    });

    expect(resultado).toEqual({
      estado: "VIGENTE",
      tipo: "VECINDAD",
      emitidaEn: FILA.emitidaEn.toISOString(),
      titular: "Juan Poot",
      direccion: "Calle 10, Motul",
    });
  });
});
