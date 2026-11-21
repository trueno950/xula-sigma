import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NoEncontradoError } from "@/shared/lib/errores";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { usuarios } from "./esquema";
import { motivoDe } from "./genteDePrueba";
import {
  contextoDeActor,
  credencialDe,
  darDeBaja,
  filaDe,
  marcarBajaDirecta,
  TEMPORAL_NUEVA,
  trazasDe,
  unaPersona,
} from "./reactivacionDePrueba";
import { reactivarUsuario } from "./reactivacionDeUsuario";

/**
 * S3, las guardas: «aplican las mismas guardas que la baja: rol, 404 para
 * otro municipio y nunca la propia cuenta».
 *
 * **El orden se prueba, no solo el resultado.** El objetivo se resuelve bajo
 * RLS antes de mirar el rol, asi que un id de Ticul responde «no existe» y no
 * un 403 que confirme que existe; con ids enumerables ese 403 alcanza para
 * mapear quien trabaja en el municipio de al lado.
 *
 * Cada caso mira la fila ademas del error: un rechazo que igual hubiera
 * escrito dejaria la cuenta activa con la clave mostrada en ningun lado.
 */

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("las guardas de la reactivacion", () => {
  it("nadie reactiva su propia cuenta", async () => {
    const { id } = await unaPersona();
    await darDeBaja(motul, id);

    const fallo = await motivoDe(() =>
      reactivarUsuario(contextoDeActor(motul, "ADMIN_MUNICIPAL", id), {
        usuarioId: id,
        nuevaClave: TEMPORAL_NUEVA,
      }),
    );

    expect(fallo.codigo).toBe("NO_AUTORIZADO");
    expect((await filaDe(motul, id))?.bajaEn).toBeInstanceOf(Date);
  });

  it("un id de otro municipio es NO_ENCONTRADO y no escribe nada", async () => {
    const { id } = await unaPersona(ticul);
    await darDeBaja(ticul, id);
    const antes = await credencialDe(ticul, id);

    const fallo = await motivoDe(() =>
      reactivarUsuario(contextoDeActor(motul, "ADMIN_MUNICIPAL"), {
        usuarioId: id,
        nuevaClave: TEMPORAL_NUEVA,
      }),
    );

    expect(fallo.codigo).toBe("NO_ENCONTRADO");
    expect((await filaDe(ticul, id))?.bajaEn).toBeInstanceOf(Date);
    expect((await credencialDe(ticul, id))?.password).toBe(antes?.password);
    // Solo la traza de la baja: la de la reactivacion no se escribio.
    await expect(trazasDe(ticul, id)).resolves.toHaveLength(1);
  });

  it("un CONSULTA no reactiva a nadie", async () => {
    const { id } = await unaPersona();
    await darDeBaja(motul, id);

    const fallo = await motivoDe(() =>
      reactivarUsuario(contextoDeActor(motul, "CONSULTA"), {
        usuarioId: id,
        nuevaClave: TEMPORAL_NUEVA,
      }),
    );

    expect(fallo.codigo).toBe("NO_AUTORIZADO");
    expect((await filaDe(motul, id))?.bajaEn).toBeInstanceOf(Date);
  });

  it("un SUPER_ADMIN no reactiva: destraba, no administra", async () => {
    const { id } = await unaPersona();
    await darDeBaja(motul, id);

    const fallo = await motivoDe(() =>
      reactivarUsuario(contextoDeActor(motul, "SUPER_ADMIN"), {
        usuarioId: id,
        nuevaClave: TEMPORAL_NUEVA,
      }),
    );

    expect(fallo.codigo).toBe("NO_AUTORIZADO");
    expect((await filaDe(motul, id))?.bajaEn).toBeInstanceOf(Date);
  });

  it("a un SUPER_ADMIN de baja no lo reactiva nadie", async () => {
    const { id } = await unaPersona();

    // La baja de un SUPER_ADMIN no la hace el panel —`puedeDarDeBaja` lo
    // excluye—, asi que se llega a ese estado por la base, como con un
    // script de operacion.
    await marcarBajaDirecta(motul, id);
    await withTenant(motul, (tx) =>
      tx
        .update(usuarios)
        .set({ rol: "SUPER_ADMIN" })
        .where(eq(usuarios.id, id)),
    );

    const fallo = await motivoDe(() =>
      reactivarUsuario(contextoDeActor(motul, "ADMIN_MUNICIPAL"), {
        usuarioId: id,
        nuevaClave: TEMPORAL_NUEVA,
      }),
    );

    expect(fallo.codigo).toBe("NO_AUTORIZADO");
    expect((await filaDe(motul, id))?.bajaEn).toBeInstanceOf(Date);
  });
  /**
   * S3: «404 para otro municipio». Lo que se afirma no es solo el codigo sino
   * que las dos respuestas son **indistinguibles**: un id que no existe y uno
   * de Ticul tienen que devolver lo mismo, o el borde se vuelve un oraculo de
   * existencia para el municipio de al lado.
   */
  it("S3: un id inexistente y uno de otro municipio responden lo mismo", async () => {
    const { id: ajeno } = await unaPersona(ticul);
    await darDeBaja(ticul, ajeno);

    const inexistente = await motivoDe(() =>
      reactivarUsuario(contextoDeActor(motul, "ADMIN_MUNICIPAL"), {
        usuarioId: randomUUID(),
        nuevaClave: TEMPORAL_NUEVA,
      }),
    );
    const deOtro = await motivoDe(() =>
      reactivarUsuario(contextoDeActor(motul, "ADMIN_MUNICIPAL"), {
        usuarioId: ajeno,
        nuevaClave: TEMPORAL_NUEVA,
      }),
    );

    expect(inexistente).toBeInstanceOf(NoEncontradoError);
    expect(deOtro).toBeInstanceOf(NoEncontradoError);
    expect(deOtro.codigo).toBe(inexistente.codigo);
    // Nombre y mensaje tambien: dos cuerpos distintos serian dos respuestas.
    expect(String(deOtro)).toBe(String(inexistente));
  });

  /**
   * S3: un rol sin permiso no aprende nada del estado de la cuenta. El rol se
   * mira **antes** que `bajaEn`, asi que activa y de baja responden lo mismo:
   * `CUENTA_ACTIVA` —que dice que existe y que no esta de baja— solo lo ve
   * quien podria reactivarla.
   */
  it("S3: un rol sin permiso nunca llega a distinguir activa de inexistente", async () => {
    const activa = await unaPersona();
    const deBaja = await unaPersona();
    await darDeBaja(motul, deBaja.id);

    const sobreActiva = await motivoDe(() =>
      reactivarUsuario(contextoDeActor(motul, "OPERADOR"), {
        usuarioId: activa.id,
        nuevaClave: TEMPORAL_NUEVA,
      }),
    );
    const sobreDeBaja = await motivoDe(() =>
      reactivarUsuario(contextoDeActor(motul, "OPERADOR"), {
        usuarioId: deBaja.id,
        nuevaClave: TEMPORAL_NUEVA,
      }),
    );

    expect(sobreActiva.codigo).toBe("NO_AUTORIZADO");
    expect(sobreActiva.codigo).not.toBe("CUENTA_ACTIVA");
    expect(sobreDeBaja.codigo).toBe(sobreActiva.codigo);
    expect(String(sobreDeBaja)).toBe(String(sobreActiva));
    expect((await filaDe(motul, deBaja.id))?.bajaEn).toBeInstanceOf(Date);
  });
});
