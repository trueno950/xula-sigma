import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearDarDeBajaCalle } from "./application/darDeBajaCalle";
import { crearRenombrarCalle } from "./application/renombrarCalle";
import { crearReparentearCalle } from "./application/reparentearCalle";
import { crearUbicarCalle } from "./application/ubicarCalle";
import {
  type CambioDeCalle,
  esperarOperacionBloqueada,
  iniciarCarreraDeCalle,
} from "./carrerasDeCalleDePrueba";
import type { CalleId } from "./domain";
import { calles } from "./infrastructure/esquema";
import { repositorioDeCallesSql } from "./infrastructure/repositorioDeCallesSql";
import { repositorioDeLugaresSql } from "./infrastructure/repositorioDeLugaresSql";
import { contextoDe, crearCalle, crearLugar } from "./lugarDePrueba";

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const cambiarPunto: CambioDeCalle = async (tx, id) => {
  await tx`
    UPDATE calles
       SET latitud = 20.937001, longitud = -89.623701
     WHERE id = ${id}
  `;
};

const cambiarNombre: CambioDeCalle = async (tx, id) => {
  await tx`UPDATE calles SET nombre = 'Nombre concurrente' WHERE id = ${id}`;
};

const ejecutarCarrera = async (
  id: CalleId,
  operacion: () => Promise<void>,
  cambio: CambioDeCalle,
): Promise<void> => {
  const carrera = iniciarCarreraDeCalle(id, cambio);
  await carrera.lista;
  const pendiente = operacion();
  await esperarOperacionBloqueada(pendiente);
  carrera.liberar();
  await carrera.transaccion;
  await pendiente;
};

const leerCalle = (id: CalleId) =>
  withTenant(motul, (tx) => repositorioDeCallesSql.buscarPorId(tx, id));

describe("mutaciones de calles bajo concurrencia", () => {
  it("renombrar conserva una modificacion concurrente al releer con lock", async () => {
    const lugarId = await crearLugar("comisaria", "Carrera de renombre");
    const calleId = await crearCalle(lugarId, "Nombre original");
    const renombrar = crearRenombrarCalle(repositorioDeCallesSql);

    await ejecutarCarrera(
      calleId,
      () => renombrar(calleId, "Nombre final", contextoDe()),
      cambiarPunto,
    );

    await expect(leerCalle(calleId)).resolves.toMatchObject({
      nombre: "Nombre final",
      punto: { latitud: 20.937001, longitud: -89.623701 },
    });
  });

  it("ubicar conserva un nombre concurrente al releer con lock", async () => {
    const lugarId = await crearLugar("comisaria", "Carrera de ubicacion");
    const calleId = await crearCalle(lugarId, "Nombre original");
    const ubicar = crearUbicarCalle(repositorioDeCallesSql);

    await ejecutarCarrera(
      calleId,
      () =>
        ubicar(calleId, { latitud: 20.938, longitud: -89.624 }, contextoDe()),
      cambiarNombre,
    );

    await expect(leerCalle(calleId)).resolves.toMatchObject({
      nombre: "Nombre concurrente",
      punto: { latitud: 20.938, longitud: -89.624 },
    });
  });

  it("reparentear conserva un punto concurrente al releer con lock", async () => {
    const origenId = await crearLugar("comisaria", "Origen de carrera");
    const destinoId = await crearLugar("comisaria", "Destino de carrera");
    const calleId = await crearCalle(origenId, "Calle de carrera");
    const reparentear = crearReparentearCalle(
      repositorioDeCallesSql,
      repositorioDeLugaresSql,
    );

    await ejecutarCarrera(
      calleId,
      () => reparentear(calleId, destinoId, contextoDe()),
      cambiarPunto,
    );

    await expect(leerCalle(calleId)).resolves.toMatchObject({
      lugarId: destinoId,
      punto: { latitud: 20.937001, longitud: -89.623701 },
    });
  });

  it("dar de baja conserva un nombre concurrente al releer con lock", async () => {
    const lugarId = await crearLugar("comisaria", "Carrera de baja");
    const calleId = await crearCalle(lugarId, "Nombre original");
    const darDeBaja = crearDarDeBajaCalle(repositorioDeCallesSql);

    await ejecutarCarrera(
      calleId,
      () => darDeBaja(calleId, contextoDe()),
      cambiarNombre,
    );

    await expect(leerCalle(calleId)).resolves.toBeNull();
    await expect(
      withTenant(motul, (tx) =>
        tx
          .select({ nombre: calles.nombre, bajaEn: calles.bajaEn })
          .from(calles)
          .where(eq(calles.id, calleId)),
      ),
    ).resolves.toMatchObject({
      0: { nombre: "Nombre concurrente", bajaEn: expect.any(Date) },
    });
  });
});
