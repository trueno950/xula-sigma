import { readFileSync } from "node:fs";
import {
  ejecutarPsql,
  ejecutarPsqlFallido,
  RUTA_DE_BUSQUEDA_ANTERIOR,
} from "./baseAnteriorAlCorteDePrueba";
import { comoLugarId } from "./domain";
import { esRegistro } from "./migracionDeZonasReportesDePrueba";
import type { LugarBorradoDeSalida } from "./migracionDeZonasTiposDePrueba";

const MARCADOR_INICIO = "__B3D_LUGARES_BORRADOS_JSON_INICIO__";
const MARCADOR_FIN = "__B3D_LUGARES_BORRADOS_JSON_FIN__";

export type { LugarBorradoDeSalida } from "./migracionDeZonasTiposDePrueba";

/**
 * El script corre como `xula_app` -el rol de menor privilegio que alcanza,
 * la regla de `AGENTS.md` para scripts operativos- y con el `search_path`
 * del esquema anterior, que es donde viven los `sector` y `manzana` que
 * viene a migrar. En el esquema vivo ya no puede existir ninguno.
 */
const entradaConEsquema = (entrada: string) =>
  `SET search_path TO ${RUTA_DE_BUSQUEDA_ANTERIOR};\n${entrada}`;

const ejecutarPsqlFallida = (opciones: {
  databaseUrl: string;
  entrada: string;
}) =>
  ejecutarPsqlFallido({
    databaseUrl: opciones.databaseUrl,
    entrada: entradaConEsquema(opciones.entrada),
  });
const comandosDeSalida = [
  "\\pset format unaligned",
  "\\pset tuples_only on",
  `\\echo ${MARCADOR_INICIO}`,
  "SELECT COALESCE(json_agg(json_build_object('subdominio', subdominio, 'lugar_id', lugar_id, 'tipo', tipo, 'nombre', nombre, 'padre_id', padre_id, 'baja_en', baja_en) ORDER BY subdominio, tipo, nombre, lugar_id), '[]'::json) FROM lugares_borrados;",
  `\\echo ${MARCADOR_FIN}`,
].join("\n");
const guionDeLaMigracion = () =>
  readFileSync("scripts/migrar-sectores-a-zonas.sql", "utf8");

const ejecutarGuion = (opciones: { databaseUrl: string; extra?: string }) =>
  ejecutarPsql({
    databaseUrl: opciones.databaseUrl,
    entrada: entradaConEsquema(
      `${guionDeLaMigracion()}\n${opciones.extra ?? ""}`,
    ),
  });

export const ejecutarMigracion = (opciones: {
  databaseUrl: string;
  extra?: string;
}) => ejecutarGuion(opciones);
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
    entrada: guionDeLaMigracion(),
  }),
});
export const ejecutarMigracionConSalida = (opciones: {
  databaseUrl: string;
  subdominio: string;
}) => {
  const salida = ejecutarGuion({
    databaseUrl: opciones.databaseUrl,
    extra: `${comandosDeSalida}\n`,
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
