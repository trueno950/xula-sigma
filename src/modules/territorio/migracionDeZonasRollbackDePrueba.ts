import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { comoLugarId } from "./domain";
import { esRegistro } from "./migracionDeZonasReportesDePrueba";
import type { LugarBorradoDeSalida } from "./migracionDeZonasTiposDePrueba";

const MARCADOR_INICIO = "__B3D_LUGARES_BORRADOS_JSON_INICIO__";
const MARCADOR_FIN = "__B3D_LUGARES_BORRADOS_JSON_FIN__";

export type { LugarBorradoDeSalida } from "./migracionDeZonasTiposDePrueba";

let psqlNativoDisponible: boolean | null = null;
const hayPsqlNativo = () => {
  if (psqlNativoDisponible === null) {
    try {
      execFileSync("psql", ["--version"], {
        stdio: ["ignore", "ignore", "ignore"],
      });
      psqlNativoDisponible = true;
    } catch {
      psqlNativoDisponible = false;
    }
  }
  return psqlNativoDisponible;
};
const comandoPsql = (databaseUrl: string): [string, string[]] =>
  hayPsqlNativo()
    ? ["psql", [databaseUrl, "-X", "-v", "ON_ERROR_STOP=1"]]
    : [
        "docker",
        [
          "exec",
          "-i",
          "xula-pg",
          "psql",
          databaseUrl.replace(":55432", ":5432"),
          "-X",
          "-v",
          "ON_ERROR_STOP=1",
        ],
      ];
const ejecutarPsql = (opciones: { databaseUrl: string; entrada: string }) => {
  const [cmd, args] = comandoPsql(opciones.databaseUrl);
  return execFileSync(cmd, args, {
    input: opciones.entrada,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).toString();
};
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

export type { CalleRechazadaDeSalida } from "./migracionDeZonasReportesDePrueba";
// No calcula el reporte de rechazos aca: no todo bloqueo llega a emitir el
// NOTICE de calles (un choque anterior, como un nombre de sector
// duplicado, aborta antes). Cada test parsea con la funcion que le toca.
export const ejecutarMigracionConBloqueo = (databaseUrl: string) => ({
  salida: ejecutarPsqlFallida({
    databaseUrl,
    entrada: readFileSync("scripts/migrar-sectores-a-zonas.sql", "utf8"),
  }),
});
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
