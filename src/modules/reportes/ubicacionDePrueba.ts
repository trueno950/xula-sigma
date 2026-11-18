import {
  altaDeCalle,
  altaDeDomicilio,
  altaDeLugar,
  type CalleId,
  type DomicilioId,
  type LugarId,
} from "@/modules/territorio";
import {
  contextoDe,
  type GentePorMunicipio,
} from "@/shared/auth/genteDePrueba";
import { registrarReporte } from "./composicion";

/**
 * El territorio de `ubicacionEnBandeja.integration.test.ts`: una comisaria de
 * cada municipio con la calle y el domicilio donde ocurren los reportes.
 *
 * Comparte forma con `bandejaDelFiltroDePrueba.ts` y vive aparte por la
 * metrica de lineas por archivo. No es un `*.test.ts`, asi que vitest no lo
 * recoge como suite.
 */

export type Municipio = "motul" | "ticul";

export type Territorio = {
  /** La raiz del municipio: es el `raizId` del enlace al mapa operativo. */
  readonly comisaria: LugarId;
  /** El lugar del reporte, un nivel abajo de la raiz. */
  readonly colonia: LugarId;
  readonly calle: CalleId;
  readonly domicilio: DomicilioId;
};

const actor = (
  gente: GentePorMunicipio,
  municipio: Municipio,
  rol: "ADMIN_MUNICIPAL" | "OPERADOR",
) => contextoDe(gente, municipio, rol);

const domicilioEn = async (datos: {
  contexto: ReturnType<typeof contextoDe>;
  lugarId: LugarId;
  calleId: CalleId;
}): Promise<DomicilioId> => {
  const { id } = await altaDeDomicilio(
    {
      lugarId: datos.lugarId,
      calleId: datos.calleId,
      numero: "42",
      entreCalleAId: null,
      entreCalleBId: null,
      referencia: null,
    },
    datos.contexto,
  );

  return id;
};

export const sembrarTerritorio = async (opciones: {
  gente: GentePorMunicipio;
  municipio: Municipio;
  etiqueta: string;
}): Promise<Territorio> => {
  const contexto = actor(opciones.gente, opciones.municipio, "ADMIN_MUNICIPAL");
  const { id: comisaria } = await altaDeLugar(
    {
      tipo: "comisaria",
      nombre: `Comisaria ${opciones.etiqueta}`,
      padreId: null,
    },
    contexto,
  );
  const { id: colonia } = await altaDeLugar(
    {
      tipo: "colonia",
      nombre: `Colonia ${opciones.etiqueta}`,
      padreId: comisaria,
    },
    contexto,
  );
  // La calle vive en el asentamiento, no en la colonia: `territorio` solo
  // administra el catalogo de calles en una cabecera o una comisaria.
  const { id: calle } = await altaDeCalle(
    { nombre: `Calle ${opciones.etiqueta}`, lugarId: comisaria },
    contexto,
  );
  const domicilio = await domicilioEn({
    contexto,
    lugarId: colonia,
    calleId: calle,
  });

  return { comisaria, colonia, calle, domicilio };
};

/**
 * Registra un reporte en la colonia del escenario, por «Lugar y calle» o por
 * «Domicilio registrado» -las dos formas que S4 y S11 tienen que distinguir-.
 */
export const reporteEn = async (opciones: {
  gente: GentePorMunicipio;
  municipio: Municipio;
  territorio: Territorio;
  ubicacion: {
    calleId?: string | null;
    domicilioId?: string;
    descripcion?: string;
  };
}) =>
  registrarReporte(
    {
      tipo: "BACHE",
      lugarId: opciones.territorio.colonia,
      ...(opciones.ubicacion.domicilioId
        ? { domicilioId: opciones.ubicacion.domicilioId }
        : { calleId: opciones.ubicacion.calleId ?? null }),
      referencia: null,
      descripcion: opciones.ubicacion.descripcion ?? "Bache frente al parque",
      personaId: null,
    },
    actor(opciones.gente, opciones.municipio, "OPERADOR"),
  );
