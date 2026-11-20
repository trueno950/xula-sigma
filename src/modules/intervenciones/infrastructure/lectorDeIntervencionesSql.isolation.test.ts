import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { altaDeLugar } from "@/modules/territorio";
import {
  contextoDe,
  type GentePorMunicipio,
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
import { contarIntervenciones, listarIntervenciones } from "../composicion";
import { intervencionDe } from "../intervencionDePrueba";
import { intervenciones } from "./esquema";

/**
 * El lector de la bandeja y sus conteos contra Postgres real (`intervenciones-ux`,
 * S2 y S3). Dos cosas que solo la base puede demostrar: que el orden es el de
 * la fecha que la pantalla muestra -la ocurrencia, no la captura- y que los
 * conteos por estado salen del `GROUP BY` acotado por RLS, no de las filas de
 * una pagina ni de las de otro municipio.
 */

type Municipio = "motul" | "ticul";

let gente: GentePorMunicipio;

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

beforeEach(async () => {
  await owner`TRUNCATE revisiones_de_intervenciones, intervenciones`;
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const lugarDe = async (municipio: Municipio, nombre: string) => {
  const { id } = await altaDeLugar(
    { tipo: "comisaria", nombre, padreId: null },
    contextoDe(gente, municipio, "ADMIN_MUNICIPAL"),
  );

  return id;
};

const insertar = (
  municipio: Municipio,
  lugarId: string,
  datos: {
    estado: "PLANIFICADA" | "EN_EJECUCION" | "CANCELADA";
    tipo: "OBRA" | "BACHE" | "FUGA";
    fechaDeOcurrencia: string;
  },
) =>
  withTenant(municipio === "motul" ? motul : ticul, async (tx) => {
    await tx.insert(intervenciones).values({
      ...intervencionDe({
        ayuntamientoId: municipio === "motul" ? motul : ticul,
        lugarId,
        registradoPorUsuarioId: gente[municipio].OPERADOR,
        estado: datos.estado,
        tipo: datos.tipo,
      }),
      fechaDeOcurrencia: datos.fechaDeOcurrencia,
    });
  });

const sembrarTresDeMotulYUnaDeTicul = async () => {
  const lugarMotul = await lugarDe("motul", "Comisaria Motul Tablero");
  const lugarTicul = await lugarDe("ticul", "Comisaria Ticul Tablero");

  // El orden de captura es el de insercion (enero, marzo, febrero) y el de
  // ocurrencia es otro a proposito: con `capturadoEn` saldrian en otro orden.
  await insertar("motul", lugarMotul, {
    estado: "PLANIFICADA",
    tipo: "OBRA",
    fechaDeOcurrencia: "2026-01-15",
  });
  await insertar("motul", lugarMotul, {
    estado: "CANCELADA",
    tipo: "BACHE",
    fechaDeOcurrencia: "2026-03-10",
  });
  await insertar("motul", lugarMotul, {
    estado: "EN_EJECUCION",
    tipo: "FUGA",
    fechaDeOcurrencia: "2026-02-01",
  });
  await insertar("ticul", lugarTicul, {
    estado: "CANCELADA",
    tipo: "OBRA",
    fechaDeOcurrencia: "2026-03-11",
  });
};

const motulContexto = () => contextoDe(gente, "motul", "ADMIN_MUNICIPAL");
const ticulContexto = () => contextoDe(gente, "ticul", "ADMIN_MUNICIPAL");

describe("bandeja de intervenciones contra Postgres", () => {
  it("lista por ocurrencia mas reciente, que es la fecha que se ve", async () => {
    await sembrarTresDeMotulYUnaDeTicul();

    const filas = await listarIntervenciones({}, motulContexto());

    expect(filas.map((fila) => fila.fechaDeOcurrencia)).toEqual([
      "2026-03-10",
      "2026-02-01",
      "2026-01-15",
    ]);
  });

  it("no ve las intervenciones del otro municipio", async () => {
    await sembrarTresDeMotulYUnaDeTicul();

    const propias = await listarIntervenciones({}, motulContexto());
    const ajenas = await listarIntervenciones({}, ticulContexto());

    expect(propias).toHaveLength(3);
    expect(ajenas).toHaveLength(1);
    expect(ajenas[0]?.fechaDeOcurrencia).toBe("2026-03-11");
  });

  it("el filtro de estado acota la columna que se pidio", async () => {
    await sembrarTresDeMotulYUnaDeTicul();

    const filas = await listarIntervenciones(
      { estado: "CANCELADA" },
      motulContexto(),
    );

    expect(filas.map((fila) => fila.estado)).toEqual(["CANCELADA"]);
  });

  it("cuenta los cuatro estados del municipio, con el estado en cero incluido", async () => {
    await sembrarTresDeMotulYUnaDeTicul();

    await expect(contarIntervenciones({}, motulContexto())).resolves.toEqual({
      porEstado: {
        PLANIFICADA: 1,
        EN_EJECUCION: 1,
        FINALIZADA: 0,
        CANCELADA: 1,
      },
      total: 3,
    });
  });

  it("los conteos llevan los filtros puestos y el estado fuera del eje", async () => {
    await sembrarTresDeMotulYUnaDeTicul();

    const deObra = await contarIntervenciones(
      { tipo: "OBRA" },
      motulContexto(),
    );
    const delOtro = await contarIntervenciones({}, ticulContexto());

    expect(deObra.total).toBe(1);
    expect(deObra.porEstado.PLANIFICADA).toBe(1);
    expect(delOtro.total).toBe(1);
    expect(delOtro.porEstado.PLANIFICADA).toBe(0);
  });
});
