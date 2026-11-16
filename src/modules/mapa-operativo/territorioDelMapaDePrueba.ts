import { registrarIntervencion } from "@/modules/intervenciones";
import { registrarReporte } from "@/modules/reportes";
import {
  altaDeCalle,
  altaDeLugar,
  type LugarId,
  ubicarCalle,
} from "@/modules/territorio";
import {
  contextoDe,
  type GentePorMunicipio,
} from "@/shared/auth/genteDePrueba";

/**
 * Siembra el territorio que recorre `agregarMapa.integration.test.ts`: dos
 * comisarias de Motul (una con colonia) y una de Ticul, cada una con su
 * calle ubicada y sus hechos.
 */

type Municipio = "motul" | "ticul";
type Punto = { latitud: number; longitud: number };

const MARCA = "mapa-integracion";

export const PUNTO_A: Punto = { latitud: 21.02, longitud: -89.6 };
export const PUNTO_B: Punto = { latitud: 20.9, longitud: -89.5 };
const PUNTO_AJENO: Punto = { latitud: 20.4, longitud: -89.9 };

type DatosDeHecho = {
  municipio: Municipio;
  lugarId: LugarId;
  calleId: string | null;
};

type DatosDeCalle = {
  municipio: Municipio;
  lugarId: LugarId;
  nombre: string;
  punto: Punto;
};

const sembrador = (gente: GentePorMunicipio) => {
  const contexto = (municipio: Municipio) =>
    contextoDe(gente, municipio, "ADMIN_MUNICIPAL");

  const lugarDe = async (
    municipio: Municipio,
    nombre: string,
    padreId: LugarId | null = null,
  ): Promise<LugarId> => {
    const { id } = await altaDeLugar(
      { tipo: padreId ? "colonia" : "comisaria", nombre, padreId },
      contexto(municipio),
    );
    return id;
  };

  const calleUbicadaDe = async ({
    municipio,
    lugarId,
    nombre,
    punto,
  }: DatosDeCalle) => {
    const { id } = await altaDeCalle({ nombre, lugarId }, contexto(municipio));
    await ubicarCalle(id, punto, contexto(municipio));
    return id;
  };

  const reporteEn = async ({ municipio, lugarId, calleId }: DatosDeHecho) =>
    registrarReporte(
      {
        tipo: calleId ? "BACHE" : "FUGA",
        referencia: null,
        descripcion: "Bache frente al parque",
        personaId: null,
        lugarId,
        calleId,
      },
      contextoDe(gente, municipio, "OPERADOR"),
    );

  const intervencionEn = async ({
    municipio,
    lugarId,
    calleId,
  }: DatosDeHecho) =>
    registrarIntervencion(
      {
        tipo: "OBRA",
        fechaDeOcurrencia: "2026-01-15",
        lugarId,
        calleId,
        reporteId: null,
        descripcion: "Rehabilitacion del parque",
      },
      contextoDe(gente, municipio, "OPERADOR"),
    );

  return { lugarDe, calleUbicadaDe, reporteEn, intervencionEn };
};

export const sembrarTerritorioDelMapa = async (gente: GentePorMunicipio) => {
  const { lugarDe, calleUbicadaDe, reporteEn, intervencionEn } =
    sembrador(gente);

  const comisariaA = await lugarDe("motul", `Comisaria A ${MARCA}`);
  const coloniaDeA = await lugarDe(
    "motul",
    `Colonia de A ${MARCA}`,
    comisariaA,
  );
  const comisariaB = await lugarDe("motul", `Comisaria B ${MARCA}`);
  const comisariaAjena = await lugarDe("ticul", `Comisaria ajena ${MARCA}`);

  const calleDeA = await calleUbicadaDe({
    municipio: "motul",
    lugarId: comisariaA,
    nombre: `Calle A ${MARCA}`,
    punto: PUNTO_A,
  });
  const calleDeB = await calleUbicadaDe({
    municipio: "motul",
    lugarId: comisariaB,
    nombre: `Calle B ${MARCA}`,
    punto: PUNTO_B,
  });
  const calleAjena = await calleUbicadaDe({
    municipio: "ticul",
    lugarId: comisariaAjena,
    nombre: `Calle ajena ${MARCA}`,
    punto: PUNTO_AJENO,
  });

  return {
    comisariaA,
    comisariaB,
    comisariaAjena,
    reporteDeA: await reporteEn({
      municipio: "motul",
      lugarId: comisariaA,
      calleId: calleDeA,
    }),
    // La colonia no tiene catalogo de calles: su hecho se ubica por su propio
    // lugar, y cae en el subarbol de la comisaria solo si el subarbol se lee.
    reporteDeLaColonia: await reporteEn({
      municipio: "motul",
      lugarId: coloniaDeA,
      calleId: null,
    }),
    reporteDeB: await reporteEn({
      municipio: "motul",
      lugarId: comisariaB,
      calleId: calleDeB,
    }),
    intervencionDeB: await intervencionEn({
      municipio: "motul",
      lugarId: comisariaB,
      calleId: calleDeB,
    }),
    reporteAjeno: await reporteEn({
      municipio: "ticul",
      lugarId: comisariaAjena,
      calleId: calleAjena,
    }),
  };
};

export type TerritorioDelMapa = Awaited<
  ReturnType<typeof sembrarTerritorioDelMapa>
>;
