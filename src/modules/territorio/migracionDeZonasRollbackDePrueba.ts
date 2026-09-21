import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import type { CalleId, LugarId } from "./domain";
import { comoCalleId, comoLugarId } from "./domain";

const MARCADOR_INICIO = "__B3D_LUGARES_BORRADOS_JSON_INICIO__";
const MARCADOR_FIN = "__B3D_LUGARES_BORRADOS_JSON_FIN__";
export type LugarBorradoDeSalida = {
  subdominio: string;
  lugarId: LugarId;
  tipo: "sector" | "manzana";
  nombre: string;
  padreId: LugarId | null;
  bajaEn: string | null;
};
const ejecutarPsql = (opciones: { databaseUrl: string; entrada: string }) =>
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "xula-pg",
      "psql",
      opciones.databaseUrl.replace(":55432", ":5432"),
      "-X",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    {
      input: opciones.entrada,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    },
  ).toString();
const salidaDeError = (error: unknown) => {
  if (!(error instanceof Error)) throw error;
  const salida = error as Error & { stdout?: string; stderr?: string };
  return `${salida.stdout ?? ""}${salida.stderr ?? ""}`;
};
const ejecutarPsqlFallida = (opciones: {
  databaseUrl: string;
  entrada: string;
}) => {
  try {
    ejecutarPsql(opciones);
  } catch (error) {
    return salidaDeError(error);
  }
  throw new Error("La migracion debio fallar por la clave foranea.");
};
const comandosDeSalida = [
  "\\pset format unaligned",
  "\\pset tuples_only on",
  `\\echo ${MARCADOR_INICIO}`,
  "SELECT COALESCE(json_agg(json_build_object('subdominio', subdominio, 'lugar_id', lugar_id, 'tipo', tipo, 'nombre', nombre, 'padre_id', padre_id, 'baja_en', baja_en) ORDER BY subdominio, tipo, nombre, lugar_id), '[]'::json) FROM lugares_borrados;",
  `\\echo ${MARCADOR_FIN}`,
].join("\n");
export const ejecutarMigracion = ({ databaseUrl }: { databaseUrl: string }) =>
  ejecutarPsql({
    databaseUrl,
    entrada: readFileSync("scripts/migrar-sectores-a-zonas.sql", "utf8"),
  });
const esRegistro = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === "object" && valor !== null && !Array.isArray(valor);
const parsearLugar = (valor: unknown): LugarBorradoDeSalida => {
  if (
    !esRegistro(valor) ||
    typeof valor.subdominio !== "string" ||
    typeof valor.lugar_id !== "string" ||
    typeof valor.tipo !== "string" ||
    typeof valor.nombre !== "string" ||
    (typeof valor.padre_id !== "string" && valor.padre_id !== null) ||
    (typeof valor.baja_en !== "string" && valor.baja_en !== null)
  ) {
    throw new Error("Fila invalida en salida guardada.");
  }
  const tipo = valor.tipo;
  if (tipo !== "sector" && tipo !== "manzana") {
    throw new Error(`Tipo invalido en salida: ${tipo}.`);
  }
  return {
    subdominio: valor.subdominio,
    lugarId: comoLugarId(valor.lugar_id),
    tipo,
    nombre: valor.nombre,
    padreId: valor.padre_id === null ? null : comoLugarId(valor.padre_id),
    bajaEn: valor.baja_en,
  };
};
const parsearSalida = (salida: string): LugarBorradoDeSalida[] => {
  const inicio = salida.indexOf(MARCADOR_INICIO);
  const fin = salida.indexOf(MARCADOR_FIN, inicio + MARCADOR_INICIO.length);
  if (inicio < 0 || fin < 0) throw new Error("Faltan marcadores de salida.");
  const datos: unknown = JSON.parse(
    salida.slice(inicio + MARCADOR_INICIO.length, fin).trim(),
  );
  if (!Array.isArray(datos)) throw new Error("La salida JSON no es una lista.");
  return datos.map(parsearLugar);
};
export type CalleRechazadaDeSalida = {
  subdominio: string;
  sectorId: LugarId;
  calleId: CalleId;
  lugarRealId: LugarId;
};
const parsearCallesRechazadas = (salida: string) => {
  const marcador = "__B3D_CALLES_RECHAZADAS_JSON__:";
  const inicio = salida.lastIndexOf(marcador);
  if (inicio < 0) throw new Error("Falta el reporte de calles rechazadas.");
  const fin = salida.indexOf("\n", inicio);
  const json = salida
    .slice(inicio + marcador.length, fin < 0 ? undefined : fin)
    .trim();
  const datos: unknown = JSON.parse(json);
  if (!Array.isArray(datos))
    throw new Error("El reporte de calles no es una lista.");
  return datos.map((fila): CalleRechazadaDeSalida => {
    if (
      !esRegistro(fila) ||
      typeof fila.subdominio !== "string" ||
      typeof fila.sector_id !== "string" ||
      typeof fila.calle_id !== "string" ||
      typeof fila.lugar_real_id !== "string"
    )
      throw new Error("Calle rechazada invalida.");
    return {
      subdominio: fila.subdominio,
      sectorId: comoLugarId(fila.sector_id),
      calleId: comoCalleId(fila.calle_id),
      lugarRealId: comoLugarId(fila.lugar_real_id),
    };
  });
};
export const ejecutarMigracionConBloqueo = (databaseUrl: string) => {
  const salida = ejecutarPsqlFallida({
    databaseUrl,
    entrada: readFileSync("scripts/migrar-sectores-a-zonas.sql", "utf8"),
  });
  return { salida, callesRechazadas: parsearCallesRechazadas(salida) };
};
export const ejecutarMigracionConSalida = (opciones: {
  databaseUrl: string;
  subdominio: string;
}) => {
  const salida = ejecutarPsql({
    databaseUrl: opciones.databaseUrl,
    entrada: `${readFileSync("scripts/migrar-sectores-a-zonas.sql", "utf8")}\n${comandosDeSalida}\n`,
  });
  return {
    salida,
    lugaresBorrados: parsearSalida(salida).filter(
      ({ subdominio }) => subdominio === opciones.subdominio,
    ),
  };
};
export { leerEstadoDeIdempotencia } from "./migracionDeZonasRollbackEstadoDePrueba";
export { leerRestauracion } from "./migracionDeZonasRollbackLecturasDePrueba";
export { revertirMigracion } from "./migracionDeZonasRollbackReversionDePrueba";
