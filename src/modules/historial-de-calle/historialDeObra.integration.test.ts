import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  cambiarEstadoDeIntervencion,
  programarObraDeReporte,
} from "@/modules/intervenciones";
import { type ReporteId, registrarReporte } from "@/modules/reportes";
import {
  altaDeCalle,
  altaDeLugar,
  type LugarId,
  type CalleId as TerritorioCalleId,
} from "@/modules/territorio";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { limpiar, owner, sembrar } from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import { comoCalleId, leerHistorialDeCalle } from "./index";

/**
 * S5 de `intervenciones-trazabilidad`, contra Postgres real: el historial de
 * calle dice que obra se hizo -tipo, estado y fecha- y enlaza al reporte de
 * origen, en vez de la frase generica de la naturaleza.
 */
let gente: GentePorMunicipio;
let calleConObra: TerritorioCalleId;
let reporteDeLaObra: ReporteId;
let obraId: string;

const contexto = () => contextoDe(gente, "motul", "ADMIN_MUNICIPAL");

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();

  const lugar: LugarId = await altaDeLugar(
    {
      tipo: "comisaria",
      nombre: "Comisaria del historial de obra",
      padreId: null,
    },
    contexto(),
  ).then(({ id }) => id);
  calleConObra = await altaDeCalle(
    { nombre: "Calle pavimentada", lugarId: lugar },
    contexto(),
  ).then(({ id }) => id);
  reporteDeLaObra = await registrarReporte(
    {
      tipo: "BACHE",
      lugarId: lugar,
      calleId: calleConObra,
      referencia: null,
      descripcion: "Bache grande frente al parque",
      personaId: null,
    },
    contexto(),
  );
  obraId = await programarObraDeReporte(
    {
      reporteId: reporteDeLaObra,
      tipo: "PAVIMENTACION",
      descripcion: "Pavimentacion de la calle completa",
    },
    contexto(),
  );
  await cambiarEstadoDeIntervencion(
    { id: obraId, estadoNuevo: "EN_EJECUCION" },
    contexto(),
  );
  await cambiarEstadoDeIntervencion(
    { id: obraId, estadoNuevo: "FINALIZADA" },
    contexto(),
  );
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const historialDeLaCalle = () =>
  leerHistorialDeCalle(
    comoCalleId(calleConObra),
    contextoDe(gente, "motul", "CONSULTA"),
  );

describe("historialDeCalle: la obra que se hizo, contra Postgres real", () => {
  it("dice tipo, estado y reporte de origen de la intervencion", async () => {
    const historial = await historialDeLaCalle();
    const entrada = historial?.entradas.find((fila) => fila.id === obraId);

    expect(entrada?.naturaleza).toBe("INTERVENCION");
    expect(entrada?.obra).toEqual({
      tipo: "Pavimentación",
      estado: "Finalizada",
      reporteId: reporteDeLaObra,
    });
    expect(entrada?.precision).toBe("DIA");
  });

  it("las demas naturalezas no traen payload de obra", async () => {
    const historial = await historialDeLaCalle();
    const reporte = historial?.entradas.find(
      (fila) => fila.id === reporteDeLaObra,
    );

    expect(reporte?.naturaleza).toBe("REPORTE");
    expect(reporte?.obra).toBeNull();
  });

  it("una calle de otro municipio sigue sin leerse", async () => {
    await expect(
      leerHistorialDeCalle(
        comoCalleId(calleConObra),
        contextoDe(gente, "ticul", "CONSULTA"),
      ),
    ).resolves.toBeNull();
  });
});
