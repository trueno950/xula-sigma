import { describe, expect, it, vi } from "vitest";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type { PersonaParaGuardar } from "../application/puertos";
import { normalizarParaBusqueda } from "../domain";
import { repositorioDePersonasSql } from "./repositorioDePersonasSql";

/**
 * `tx` fabricado a mano, mismo patron que `catalogoDeAbreviaturasSql.test.ts`:
 * alcanza con la parte de la cadena de Drizzle que el adaptador realmente
 * usa, y corre sin Postgres.
 *
 * Lo que este archivo prueba es la costura de design.md seccion 5: que
 * `nombreNormalizado` sale de `normalizarParaBusqueda` (la misma funcion de
 * dominio) y no de una copia. No prueba el resto del adaptador —
 * `buscarPorId`, `marcarBaja`, `listar`— porque esos no tienen decision de
 * negocio que un mock pueda ejercitar mejor que la integracion real
 * (design.md seccion 10).
 */

const txDeInsercion = () => {
  const values = vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn().mockReturnValue({ values });

  return { tx: { insert } as unknown as TransaccionTenant, values };
};

const txDeActualizacion = () => {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where });
  const update = vi.fn().mockReturnValue({ set });

  return { tx: { update } as unknown as TransaccionTenant, set, where };
};

/**
 * Aplana `queryChunks` de un objeto `SQL` de Drizzle a texto plano, params
 * incluidos entre corchetes. No es la forma en que Postgres ve la consulta
 * (eso lo prueba `EXPLAIN` en integracion, tasks.md 3.8) — alcanza para
 * probar que `buscar` no vuelve a tocar `cadenaExpandida` ni el `umbral`
 * antes de mandarlos, que es la unica decision de negocio de este metodo.
 */
const aplanar = (valor: unknown): string => {
  if (
    valor &&
    typeof valor === "object" &&
    Array.isArray((valor as { queryChunks?: unknown }).queryChunks)
  ) {
    return (valor as { queryChunks: unknown[] }).queryChunks
      .map(aplanar)
      .join("");
  }

  // Columna de Drizzle: identificador, no parametro. Sale por su nombre,
  // no por `[valor]`, para no confundir "compara contra esta columna" con
  // "compara contra este literal".
  if (
    valor &&
    typeof valor === "object" &&
    "name" in valor &&
    "table" in valor
  ) {
    return `<${(valor as { name: string }).name}>`;
  }

  if (valor && typeof valor === "object" && "value" in valor) {
    return String((valor as { value: unknown }).value);
  }

  return `[${String(valor)}]`;
};

const persona: PersonaParaGuardar = {
  nombres: "Maria Guadalupe",
  primerApellido: "Kumul",
  segundoApellido: "Pech",
  curp: null,
};

const expansiones = new Map([["gpe", "guadalupe"]]);

describe("repositorioDePersonasSql", () => {
  it("guardar escribe nombreNormalizado calculado con normalizarParaBusqueda", async () => {
    const { tx, values } = txDeInsercion();
    const ayuntamientoId = "motul" as AyuntamientoId;

    await repositorioDePersonasSql.guardar(tx, {
      id: "persona-1",
      ayuntamientoId,
      persona,
      expansiones,
    });

    const esperado = normalizarParaBusqueda(
      "Maria Guadalupe Kumul Pech",
      expansiones,
    );

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "persona-1",
        ayuntamientoId,
        nombres: persona.nombres,
        primerApellido: persona.primerApellido,
        segundoApellido: persona.segundoApellido,
        curp: persona.curp,
        nombreNormalizado: esperado,
      }),
    );
  });

  it("actualizar recalcula nombreNormalizado sobre los datos nuevos", async () => {
    const { tx, set, where } = txDeActualizacion();
    const editada: PersonaParaGuardar = {
      ...persona,
      primerApellido: "Canul",
    };

    await repositorioDePersonasSql.actualizar(tx, {
      id: "persona-1",
      persona: editada,
      expansiones,
    });

    const esperado = normalizarParaBusqueda(
      "Maria Guadalupe Canul Pech",
      expansiones,
    );

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        primerApellido: "Canul",
        nombreNormalizado: esperado,
      }),
    );
    expect(where).toHaveBeenCalled();
  });

  it("buscar fija el umbral recibido y usa la cadena ya expandida, sin volver a normalizarla", async () => {
    const orderBy = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ orderBy });
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });
    const execute = vi.fn().mockResolvedValue(undefined);
    const tx = { select, execute } as unknown as TransaccionTenant;

    await repositorioDePersonasSql.buscar(tx, "guadalupe kumul", 0.3);

    const configuracionDeUmbral = aplanar(execute.mock.calls[0]?.[0]);
    // `true` al final y sin corchetes: Drizzle lo inlinea como literal, no
    // como parametro — es el mismo "local a la transaccion" que
    // `app.tenant` en `withTenant.ts`, no una sesion completa.
    expect(configuracionDeUmbral).toBe(
      "SELECT set_config('pg_trgm.similarity_threshold', [0.3], true)",
    );

    const filtro = aplanar(where.mock.calls[0]?.[0]);
    expect(filtro).toContain("<bajaEn> is null");
    expect(filtro).toContain("<nombreNormalizado> % [guadalupe kumul]");

    const orden = aplanar(orderBy.mock.calls[0]?.[0]);
    expect(orden).toBe(
      "similarity(<nombreNormalizado>, [guadalupe kumul]) desc",
    );
  });
});
