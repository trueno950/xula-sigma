import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  contextoDe,
  type GentePorMunicipio,
  motivoDe,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearCambiarUmbralDeAtraso } from "./application/cambiarUmbralDeAtraso";
import { crearLeerUmbralDeAtraso } from "./application/leerUmbralDeAtraso";
import { configuracionDeReportes } from "./infrastructure/esquema";
import { repositorioDeConfiguracionDeReportesSql } from "./infrastructure/repositorioDeConfiguracionDeReportesSql";

/**
 * S1 de `gestion-municipal` contra Postgres real: el caso de uso, `withTenant`
 * y el upsert de `configuracion_de_reportes` no se pueden simular con un
 * mock. El aislamiento entre municipios tiene su propio archivo
 * (`umbralDeAtraso.isolation.test.ts`).
 */

let gente: GentePorMunicipio;

const actor = (
  municipio: "motul" | "ticul",
  rol: "ADMIN_MUNICIPAL" | "OPERADOR",
) => contextoDe(gente, municipio, rol);

const leer = crearLeerUmbralDeAtraso(repositorioDeConfiguracionDeReportesSql);
const cambiar = crearCambiarUmbralDeAtraso(
  repositorioDeConfiguracionDeReportesSql,
);

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("umbral de atraso configurable", () => {
  it("un municipio sin fila lee el valor por defecto de 7", async () => {
    await expect(leer(actor("motul", "OPERADOR"))).resolves.toBe(7);
  });

  it("lo que un municipio guarda se lee, y el otro sigue con el default", async () => {
    await cambiar(30, actor("motul", "ADMIN_MUNICIPAL"));

    await expect(leer(actor("motul", "OPERADOR"))).resolves.toBe(30);
    await expect(leer(actor("ticul", "OPERADOR"))).resolves.toBe(7);
  });

  it("un rol sin permiso no cambia nada y el valor guardado sobrevive", async () => {
    const antes = await leer(actor("motul", "OPERADOR"));

    await expect(cambiar(1, actor("motul", "OPERADOR"))).rejects.toMatchObject({
      codigo: "NO_AUTORIZADO",
    });

    await expect(leer(actor("motul", "OPERADOR"))).resolves.toBe(antes);
  });

  /**
   * El `ayuntamiento_id` sale del contexto del servidor y de ningun otro
   * lado: lo que queda escrito es la fila de quien lo cambio. Se afirma sobre
   * la fila cruda y no sobre el caso de uso, porque RLS haria pasar por
   * correcta cualquier lectura equivocada.
   */
  it("la fila escrita pertenece al ayuntamiento del contexto, no a otro", async () => {
    await cambiar(21, actor("motul", "ADMIN_MUNICIPAL"));

    const filas = await withTenant(motul, (tx) =>
      tx.select().from(configuracionDeReportes),
    );

    expect(filas).toHaveLength(1);
    expect(filas[0]?.ayuntamientoId).toBe(motul);
    expect(filas[0]?.diasDeAtraso).toBe(21);
  });

  it("cambiar dos veces deja una sola fila por municipio, no un historial", async () => {
    await cambiar(5, actor("ticul", "ADMIN_MUNICIPAL"));
    await cambiar(12, actor("ticul", "ADMIN_MUNICIPAL"));

    await expect(leer(actor("ticul", "OPERADOR"))).resolves.toBe(12);
    const filas = await withTenant(ticul, (tx) =>
      tx.select().from(configuracionDeReportes),
    );
    expect(filas).toHaveLength(1);
  });

  it("los dos extremos del rango se guardan y el de afuera se rechaza", async () => {
    await cambiar(1, actor("motul", "ADMIN_MUNICIPAL"));
    await expect(leer(actor("motul", "OPERADOR"))).resolves.toBe(1);

    await cambiar(90, actor("motul", "ADMIN_MUNICIPAL"));
    await expect(leer(actor("motul", "OPERADOR"))).resolves.toBe(90);

    expect(
      await motivoDe(() => cambiar(91, actor("motul", "ADMIN_MUNICIPAL"))),
    ).toMatchObject({ codigo: "VALIDACION" });
    await expect(leer(actor("motul", "OPERADOR"))).resolves.toBe(90);
  });
});
