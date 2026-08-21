import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  contextoDe,
  type GentePorMunicipio,
  motivoDe,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { limpiar, owner, sembrar } from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import { crearAlmacenDePrueba } from "./application/almacenDePrueba";
import { crearCambiarEscudo } from "./application/cambiarEscudo";
import { escribirMarca, marcaDe, pngValido } from "./escudoDePrueba";
import { repositorioDeMarcaSql } from "./infrastructure/repositorioDeMarcaSql";

/**
 * Lo que el caso de uso NO deja pasar, contra Postgres real.
 *
 * Separado de `cambiarEscudo.integration.test.ts` por las 200 lineas por
 * archivo de `AGENTS.md`. La setup comun vive en `escudoDePrueba.ts`.
 */

let gente: GentePorMunicipio;

const actor = (rol: Parameters<typeof contextoDe>[2]) =>
  contextoDe(gente, "motul", rol);

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

beforeEach(async () => {
  await escribirMarca({});
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("cambiarEscudo: rechazos", () => {
  it("un rol distinto de ADMIN_MUNICIPAL no puede cambiar la marca", async () => {
    const almacen = crearAlmacenDePrueba();
    const cambiarEscudo = crearCambiarEscudo(almacen, repositorioDeMarcaSql);

    const motivo = await motivoDe(() =>
      cambiarEscudo({ bytes: pngValido() }, actor("OPERADOR")),
    );

    expect(motivo.codigo).toBe("NO_AUTORIZADO");
    expect(almacen.guardados.size).toBe(0);
  });

  it("el SUPER_ADMIN tampoco puede cambiar la marca de un municipio", async () => {
    /**
     * `roles.test.ts` ya prueba la regla suelta. Esto prueba que el caso de
     * uso la aplica: el escudo es la identidad institucional del municipio,
     * y quien opera la plataforma cambiandola es una suplantacion.
     */
    const almacen = crearAlmacenDePrueba();
    const cambiarEscudo = crearCambiarEscudo(almacen, repositorioDeMarcaSql);

    const motivo = await motivoDe(() =>
      cambiarEscudo({ bytes: pngValido() }, actor("SUPER_ADMIN")),
    );

    expect(motivo.codigo).toBe("NO_AUTORIZADO");
    expect(almacen.guardados.size).toBe(0);
  });

  it("unos bytes que no son PNG se rechazan sin llegar al almacen", async () => {
    /**
     * `png.test.ts` prueba el validador; esto prueba el orden del caso de
     * uso. El PUT corre antes de la transaccion (decision 4), asi que lo
     * unico que evita subir basura al bucket es que la validacion vaya
     * antes del PUT. Sin este test, ese orden es una propiedad del codigo
     * que nada fija.
     */
    const almacen = crearAlmacenDePrueba();
    const cambiarEscudo = crearCambiarEscudo(almacen, repositorioDeMarcaSql);
    const noEsPng = new TextEncoder().encode("GIF89a no soy un PNG");

    const motivo = await motivoDe(() =>
      cambiarEscudo({ bytes: noEsPng }, actor("ADMIN_MUNICIPAL")),
    );

    expect(motivo.codigo).toBe("VALIDACION");
    expect(almacen.guardados.size).toBe(0);
    expect(await marcaDe()).toEqual({});
  });

  it("una marca previa con color invalido no escribe nada y ya guardo en el almacen", async () => {
    /**
     * Las dos afirmaciones en un solo test y no en dos: la segunda solo
     * tiene sentido si la primera es cierta, y separarlas invitaria a que
     * una corriera sin la otra en algun refactor futuro.
     */
    const colorInvalido = { primario: "red;background:url(//x)" };
    await escribirMarca(colorInvalido);

    const almacen = crearAlmacenDePrueba();
    const cambiarEscudo = crearCambiarEscudo(almacen, repositorioDeMarcaSql);

    const motivo = await motivoDe(() =>
      cambiarEscudo({ bytes: pngValido() }, actor("ADMIN_MUNICIPAL")),
    );

    expect(motivo.codigo).toBe("VALIDACION");
    expect(await marcaDe()).toEqual(colorInvalido);
    // El PUT ya paso para cuando la transaccion descubre el color
    // invalido: el huerfano queda en el almacen, aceptado por la
    // decision 4 de proposal.md.
    expect(almacen.guardados.size).toBe(1);
  });
});
