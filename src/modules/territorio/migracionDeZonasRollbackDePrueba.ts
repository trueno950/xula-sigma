import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { asc, eq, inArray, or, sql } from "drizzle-orm";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { bitacora } from "@/shared/tenancy/esquema";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { DomicilioId, LugarId } from "./domain";
import { comoLugarId } from "./domain";
import { domicilios, lugares, zonas } from "./infrastructure/esquema";

const MARCADOR_INICIO = "__B3D_LUGARES_BORRADOS_JSON_INICIO__";
const MARCADOR_FIN = "__B3D_LUGARES_BORRADOS_JSON_FIN__";
export type LugarBorradoDeSalida = {
  subdominio: string;
  lugarId: LugarId;
  tipo: "sector" | "manzana";
  nombre: string;
  padreId: LugarId | null;
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
const comandosDeSalida = [
  "\\pset format unaligned",
  "\\pset tuples_only on",
  `\\echo ${MARCADOR_INICIO}`,
  "SELECT COALESCE(json_agg(json_build_object('subdominio', subdominio, 'lugar_id', lugar_id, 'tipo', tipo, 'nombre', nombre, 'padre_id', padre_id) ORDER BY subdominio, tipo, nombre, lugar_id), '[]'::json) FROM lugares_borrados;",
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
    (typeof valor.padre_id !== "string" && valor.padre_id !== null)
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
export const leerEstadoDeIdempotencia = ({
  ayuntamientoId,
}: {
  ayuntamientoId: AyuntamientoId;
}) =>
  withTenant(ayuntamientoId, async (tx) => {
    const bitacoraMigracion = await tx
      .select({ id: bitacora.id, accion: bitacora.accion })
      .from(bitacora)
      .where(
        or(
          eq(bitacora.accion, "MIGRACION_DOMICILIO"),
          eq(bitacora.accion, "BAJA_LUGAR"),
        ),
      )
      .orderBy(asc(bitacora.id));
    const zonasActuales = await tx
      .select({ id: zonas.id })
      .from(zonas)
      .orderBy(asc(zonas.id));
    const lugaresSectorManzana = await tx
      .select({ id: lugares.id, tipo: lugares.tipo })
      .from(lugares)
      .where(or(eq(lugares.tipo, "sector"), eq(lugares.tipo, "manzana")))
      .orderBy(asc(lugares.tipo), asc(lugares.id));
    return {
      migraciones: bitacoraMigracion
        .filter(({ accion }) => accion === "MIGRACION_DOMICILIO")
        .map(({ id }) => id),
      bajas: bitacoraMigracion
        .filter(({ accion }) => accion === "BAJA_LUGAR")
        .map(({ id }) => id),
      zonas: zonasActuales.map(({ id }) => id),
      lugaresSectorManzana,
    };
  });
const ordenarPadresPrimero = (filas: LugarBorradoDeSalida[]) => {
  const pendientes = [...filas];
  const ordenadas: LugarBorradoDeSalida[] = [];
  while (pendientes.length) {
    const indice = pendientes.findIndex(
      ({ padreId }) =>
        !padreId || !pendientes.some(({ lugarId }) => lugarId === padreId),
    );
    if (indice < 0) throw new Error("La salida guardada tiene un ciclo.");
    const fila = pendientes.splice(indice, 1)[0];
    if (!fila) throw new Error("No se pudo ordenar la salida guardada.");
    ordenadas.push(fila);
  }
  return ordenadas;
};
export const revertirMigracion = async (opciones: {
  ayuntamientoId: AyuntamientoId;
  lugaresBorrados: LugarBorradoDeSalida[];
}) =>
  withTenant(opciones.ayuntamientoId, async (tx) => {
    for (const lugar of ordenarPadresPrimero(opciones.lugaresBorrados)) {
      await tx.insert(lugares).values({
        id: lugar.lugarId,
        ayuntamientoId: opciones.ayuntamientoId,
        tipo: lugar.tipo,
        nombre: lugar.nombre,
        padreId: lugar.padreId,
      });
    }
    await tx.execute(
      sql`UPDATE domicilios AS d
          SET lugar_id = split_part(b.origen, ':', 3)::uuid
          FROM bitacora AS b
          WHERE b.ayuntamiento_id = ${opciones.ayuntamientoId}
            AND b.accion = 'MIGRACION_DOMICILIO'
            AND b.entidad = 'domicilios'
            AND b.entidad_id = d.id
            AND d.ayuntamiento_id = ${opciones.ayuntamientoId}`,
    );
  });
export const leerRestauracion = (opciones: {
  ayuntamientoId: AyuntamientoId;
  lugarIds: LugarId[];
  domicilioIds: DomicilioId[];
}) =>
  withTenant(opciones.ayuntamientoId, async (tx) => ({
    lugares: await tx
      .select({
        id: lugares.id,
        tipo: lugares.tipo,
        nombre: lugares.nombre,
        padreId: lugares.padreId,
      })
      .from(lugares)
      .where(inArray(lugares.id, opciones.lugarIds))
      .orderBy(asc(lugares.id)),
    domicilios: await tx
      .select({ id: domicilios.id, lugarId: domicilios.lugarId })
      .from(domicilios)
      .where(inArray(domicilios.id, opciones.domicilioIds))
      .orderBy(asc(domicilios.id)),
  }));
