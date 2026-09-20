import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bitacora } from "@/shared/tenancy/esquema";
import {
  appSinTenant,
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import type { DomicilioId, LugarId } from "./domain";
import { domicilios } from "./infrastructure/esquema";
import { crearCalle, crearDomicilioEnCalle, crearLugar } from "./lugarDePrueba";

const rutaDelScript = resolve(
  process.cwd(),
  "scripts/migrar-sectores-a-zonas.sql",
);

let coloniaId: LugarId;
let sectorId: LugarId;
let manzanaId: LugarId;
let domicilioDelSectorId: DomicilioId;
let domicilioDeLaManzanaId: DomicilioId;

beforeAll(async () => {
  await sembrar();
  const asentamientoId = await crearLugar("cabecera", "Cabecera migracion");
  coloniaId = await crearLugar("colonia", "Colonia migracion", asentamientoId);
  sectorId = await crearLugar("sector", "Sector migracion", coloniaId);
  manzanaId = await crearLugar("manzana", "Manzana migracion", sectorId);
  const calleId = await crearCalle(asentamientoId, "Calle migracion");
  domicilioDelSectorId = await crearDomicilioEnCalle(sectorId, calleId, "10");
  domicilioDeLaManzanaId = await crearDomicilioEnCalle(
    manzanaId,
    calleId,
    "11",
  );
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("migracion de sectores a zonas", () => {
  it("un UPDATE sin tenant queda bloqueado por RLS con cero filas y sin error", async () => {
    const filas = await appSinTenant`
      UPDATE domicilios
      SET lugar_id = ${coloniaId}
      WHERE id = ${domicilioDeLaManzanaId}
      RETURNING id
    `;

    expect(filas).toHaveLength(0);

    const [domicilio] = await withTenant(motul, (tx) =>
      tx
        .select({ lugarId: domicilios.lugarId })
        .from(domicilios)
        .where(eq(domicilios.id, domicilioDeLaManzanaId)),
    );
    expect(domicilio?.lugarId).toBe(manzanaId);
  });

  it("mueve todos los domicilios contados y preserva cada lugar anterior", async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("Falta DATABASE_URL.");

    // No hay psql en el host: Postgres corre en el contenedor "xula-pg"
    // (scripts/db-local.sh), asi que el script viaja por stdin a
    // `docker exec` en vez de resolverse como ruta dentro del contenedor.
    // El puerto interno es el 5432 nativo, no el 55432 publicado al host.
    const guionDelScript = readFileSync(rutaDelScript, "utf8");
    const urlInterna = databaseUrl.replace(":55432", ":5432");

    execFileSync(
      "docker",
      [
        "exec",
        "-i",
        "xula-pg",
        "psql",
        urlInterna,
        "-X",
        "-v",
        "ON_ERROR_STOP=1",
      ],
      {
        input: guionDelScript,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    const resultado = await withTenant(motul, async (tx) => {
      const domiciliosMigrados = await tx
        .select({ id: domicilios.id, lugarId: domicilios.lugarId })
        .from(domicilios)
        .where(
          and(
            eq(domicilios.ayuntamientoId, motul),
            eq(domicilios.lugarId, coloniaId),
          ),
        );
      const entradas = await tx
        .select({ entidadId: bitacora.entidadId, origen: bitacora.origen })
        .from(bitacora)
        .where(
          and(
            eq(bitacora.accion, "MIGRACION_DOMICILIO"),
            eq(bitacora.entidad, "domicilios"),
          ),
        );
      return { domiciliosMigrados, entradas };
    });

    expect(resultado.domiciliosMigrados).toEqual(
      expect.arrayContaining([
        { id: domicilioDelSectorId, lugarId: coloniaId },
        { id: domicilioDeLaManzanaId, lugarId: coloniaId },
      ]),
    );
    expect(resultado.entradas).toEqual(
      expect.arrayContaining([
        {
          entidadId: domicilioDelSectorId,
          origen: `script:migrar-sectores-a-zonas:${sectorId}`,
        },
        {
          entidadId: domicilioDeLaManzanaId,
          origen: `script:migrar-sectores-a-zonas:${manzanaId}`,
        },
      ]),
    );
  });
});
