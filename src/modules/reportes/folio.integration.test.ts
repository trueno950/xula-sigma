import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { altaDeLugar } from "@/modules/territorio";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { anioEnMerida } from "@/shared/lib/fecha";
import {
  enTransaccionParalela,
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import type { RepositorioDeReportes } from "./application/puertos";
import { crearRegistrarReporte } from "./application/registrarReporte";
import { contadorDeFoliosSql } from "./infrastructure/contadorDeFoliosSql";
import { crearLectorDeReportantesPorPadron } from "./infrastructure/lectorDeReportantesPorPadron";
import { crearLectorDeUbicacionesPorTerritorio } from "./infrastructure/lectorDeUbicacionesPorTerritorio";
import { registroDeMovimientosSql } from "./infrastructure/registroDeMovimientosSql";
import { repositorioDeReportesSql } from "./infrastructure/repositorioDeReportesSql";

/**
 * `reportes/folio.integration.test.ts`: el lock del contador bajo
 * concurrencia (design.md seccion 4, tasks.md 4.18-4.21). T6 prueba que una
 * transaccion paralela que tomo el folio deja pendiente al registro hasta el
 * COMMIT; T7 prueba que un rollback posterior no consume el folio. Mismo
 * reparto que `constancias/folio.integration.test.ts`, con la tupla del
 * contador doble en vez de triple. La particion por `(ayuntamiento, anio)`
 * vive en `folioParticion.integration.test.ts`.
 */

type Municipio = "motul" | "ticul";

let gente: GentePorMunicipio;

const actor = (municipio: Municipio, rol: Parameters<typeof contextoDe>[2]) =>
  contextoDe(gente, municipio, rol);

const registrarReporte = crearRegistrarReporte({
  repositorio: repositorioDeReportesSql,
  contador: contadorDeFoliosSql,
  movimientos: registroDeMovimientosSql,
  crearLecturaDeUbicaciones: crearLectorDeUbicacionesPorTerritorio,
  crearLecturaDeReportantes: crearLectorDeReportantesPorPadron,
});

const entrada = (lugarId: string) => ({
  tipo: "BACHE" as const,
  lugarId,
  calleId: null,
  referencia: null,
  descripcion: "Bache grande frente al parque principal",
  personaId: null,
});

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

beforeEach(async () => {
  // Aisla la serie del contador y los reportes entre `it`: cada escenario
  // asume que arranca de tablas vacias. `lugares` no necesita el mismo
  // reinicio: cada `it` crea su propio lugar con un nombre nuevo.
  await owner`TRUNCATE folios_de_reportes, reportes, movimientos_de_reportes`;
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const lugarDe = async (municipio: Municipio, nombre: string) => {
  const { id } = await altaDeLugar(
    { tipo: "comisaria", nombre, padreId: null },
    actor(municipio, "ADMIN_MUNICIPAL"),
  );
  return id;
};

describe("el contador de folios bajo lock", () => {
  it("T6: un registro que se cruza con una transaccion paralela queda pendiente y resuelve con el siguiente", async () => {
    const anio = anioEnMerida();
    const lugarId = await lugarDe("motul", "Comisaria Folio T6");

    let liberarParalela: () => void = () => {};
    const puedeConfirmar = new Promise<void>((resolve) => {
      liberarParalela = resolve;
    });

    // La transaccion paralela toma el folio con la misma sentencia exacta de
    // design.md seccion 4, escrita en SQL crudo -no Drizzle- porque
    // `enTransaccionParalela` corre sobre `postgres()` puro, ajeno al pool
    // de Drizzle que usa `withTenant`.
    let consecutivoTomado = -1;
    const paralela = enTransaccionParalela(motul, async (tx) => {
      const [fila] = await tx<{ ultimo_consecutivo: number }[]>`
        INSERT INTO folios_de_reportes (ayuntamiento_id, anio, ultimo_consecutivo)
        VALUES (${motul}, ${anio}, 1)
        ON CONFLICT (ayuntamiento_id, anio) DO UPDATE
           SET ultimo_consecutivo = folios_de_reportes.ultimo_consecutivo + 1
        RETURNING ultimo_consecutivo
      `;
      consecutivoTomado = fila!.ultimo_consecutivo;

      // Se queda abierta -sin COMMIT- hasta que el test decida soltarla.
      await puedeConfirmar;
    });

    // Le da tiempo a la paralela de terminar su INSERT y tomar el lock.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(consecutivoTomado).toBe(1);

    const registro = registrarReporte(
      entrada(lugarId),
      actor("motul", "OPERADOR"),
    );

    const PENDIENTE = Symbol("pendiente");
    const resultadoDeLaCarrera = await Promise.race([
      registro.then(() => "resuelto" as const),
      new Promise((resolve) => setTimeout(() => resolve(PENDIENTE), 300)),
    ]);

    // Lo que este test existe para probar: sin una segunda conexion real,
    // el registro resolveria antes de que la paralela suelte el lock.
    expect(resultadoDeLaCarrera).toBe(PENDIENTE);

    liberarParalela();
    await paralela;

    const id = await registro;
    const guardada = await withTenant(motul, (tx) =>
      repositorioDeReportesSql.buscarPorId(tx, id),
    );
    // `ReporteGuardado` no trae `consecutivo` (design.md seccion 10): el
    // folio impreso codifica anio y consecutivo, asi que este texto es la
    // prueba de que tomo el siguiente a `consecutivoTomado`.
    expect(guardada?.folio).toBe(`REP-${anio}-000002`);
  });

  it("T7: un registro que revierte despues de tomar folio no lo consume", async () => {
    const lugarQueFalla = await lugarDe("motul", "Comisaria Folio T7a");
    const lugarQueSale = await lugarDe("motul", "Comisaria Folio T7b");

    const repositorioQueFalla: Pick<RepositorioDeReportes, "guardar"> = {
      guardar: async () => {
        throw new Error("fallo simulado, despues de tomar folio");
      },
    };
    const registrarReporteQueFalla = crearRegistrarReporte({
      repositorio: repositorioQueFalla,
      contador: contadorDeFoliosSql,
      movimientos: registroDeMovimientosSql,
      crearLecturaDeUbicaciones: crearLectorDeUbicacionesPorTerritorio,
      crearLecturaDeReportantes: crearLectorDeReportantesPorPadron,
    });

    await expect(
      registrarReporteQueFalla(
        entrada(lugarQueFalla),
        actor("motul", "OPERADOR"),
      ),
    ).rejects.toThrow("fallo simulado");

    const id = await registrarReporte(
      entrada(lugarQueSale),
      actor("motul", "OPERADOR"),
    );
    const guardada = await withTenant(motul, (tx) =>
      repositorioDeReportesSql.buscarPorId(tx, id),
    );

    // El rollback se llevo el incremento entero: el registro exitoso toma
    // el mismo numero que hubiera tomado el que fallo.
    expect(guardada?.folio).toBe(`REP-${anioEnMerida()}-000001`);
  });
});
