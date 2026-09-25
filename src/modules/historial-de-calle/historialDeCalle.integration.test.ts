import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registrarIntervencion } from "@/modules/intervenciones";
import {
  cambiarEstadoDeReporte,
  type ReporteId,
  registrarReporte,
} from "@/modules/reportes";
import {
  altaDeCalle,
  altaDeLugar,
  type LugarId,
  renombrarCalle,
  reparentearCalle,
  type CalleId as TerritorioCalleId,
  ubicarCalle,
} from "@/modules/territorio";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { limpiar, owner, sembrar } from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import { comoCalleId, leerHistorialDeCalle } from "./index";

let gente: GentePorMunicipio;
let calleMotul: TerritorioCalleId;
let calleTicul: TerritorioCalleId;
let calleVacia: TerritorioCalleId;
let lugarMotul: LugarId;
let destinoMotul: LugarId;
let reporteId: ReporteId;
const contextoMotul = () => contextoDe(gente, "motul", "ADMIN_MUNICIPAL");

const lugarDe = (municipio: "motul" | "ticul", nombre: string) =>
  altaDeLugar(
    { tipo: "comisaria", nombre, padreId: null },
    contextoDe(gente, municipio, "ADMIN_MUNICIPAL"),
  ).then(({ id }) => id);

const calleDe = (
  municipio: "motul" | "ticul",
  lugarId: LugarId,
  nombre: string,
) =>
  altaDeCalle(
    { nombre, lugarId },
    contextoDe(gente, municipio, "ADMIN_MUNICIPAL"),
  ).then(({ id }) => id);

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
  lugarMotul = await lugarDe("motul", "Comisaria Historial");
  destinoMotul = await lugarDe("motul", "Destino Historial");
  const lugarTicul = await lugarDe("ticul", "Comisaria Historial Ticul");
  calleMotul = await calleDe("motul", lugarMotul, "Calle de la historia");
  calleVacia = await calleDe("motul", lugarMotul, "Calle sin hechos");
  calleTicul = await calleDe("ticul", lugarTicul, "Calle de Ticul");

  const contexto = contextoMotul();
  reporteId = await registrarReporte(
    {
      tipo: "BACHE",
      lugarId: lugarMotul,
      calleId: calleMotul,
      referencia: null,
      descripcion: "Bache de prueba",
      personaId: null,
    },
    contexto,
  );
  await cambiarEstadoDeReporte(
    {
      id: reporteId,
      estadoNuevo: "EN_ATENCION",
      motivoDeRechazo: null,
      folioDelOriginal: null,
    },
    contexto,
  );
  await registrarIntervencion(
    {
      tipo: "OBRA",
      fechaDeOcurrencia: "2099-01-01",
      lugarId: lugarMotul,
      calleId: calleMotul,
      reporteId: null,
      descripcion: "Intervencion de prueba",
    },
    contexto,
  );
  await renombrarCalle(calleMotul, "Calle renombrada", contexto);
  await reparentearCalle(calleMotul, destinoMotul, contexto);
  await ubicarCalle(calleMotul, { latitud: 20.97, longitud: -89.62 }, contexto);
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("historialDeCalle, contra Postgres real", () => {
  it("compone fuentes de negocio y no movimientos ni auditoria", async () => {
    const contexto = contextoDe(gente, "motul", "CONSULTA");
    const primera = await leerHistorialDeCalle(
      comoCalleId(calleMotul),
      contexto,
    );
    const segunda = await leerHistorialDeCalle(
      comoCalleId(calleMotul),
      contexto,
    );

    expect(primera).toMatchObject({ calleId: calleMotul, estado: "CON_DATOS" });
    expect(primera?.entradas).toHaveLength(5);
    expect(
      primera?.entradas.map((entrada) => entrada.naturaleza).sort(),
    ).toEqual(
      ["INTERVENCION", "REPARENTEO", "RENOMBRE", "REPORTE", "UBICACION"].sort(),
    );
    expect(
      primera?.entradas.filter((entrada) => entrada.id === reporteId),
    ).toHaveLength(1);
    expect(segunda?.entradas.map((entrada) => entrada.id)).toEqual(
      primera?.entradas.map((entrada) => entrada.id),
    );
    for (const entrada of primera?.entradas ?? []) {
      expect(entrada).not.toHaveProperty("actor");
      expect(entrada).not.toHaveProperty("usuarioId");
      expect(entrada).not.toHaveProperty("bitacoraId");
      expect(entrada).not.toHaveProperty("movimientoId");
    }
  });

  it("devuelve un estado vacio para una calle sin hechos de negocio", async () => {
    await expect(
      leerHistorialDeCalle(
        comoCalleId(calleVacia),
        contextoDe(gente, "motul", "CONSULTA"),
      ),
    ).resolves.toEqual({ calleId: calleVacia, estado: "VACIO", entradas: [] });
  });

  it("trata una calle de otro municipio como no encontrada, no como prohibida", async () => {
    await expect(
      leerHistorialDeCalle(
        comoCalleId(calleTicul),
        contextoDe(gente, "motul", "CONSULTA"),
      ),
    ).resolves.toBeNull();
  });
});
