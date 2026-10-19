import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  altaDePersona,
  comoPersonaId,
  fusionarPersonas,
} from "@/modules/padron";
import {
  altaDeLugar,
  comoLugarId,
  reparentearLugar,
} from "@/modules/territorio";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { limpiar, owner, sembrar } from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import { crearConstanciaPorId } from "./application/constanciaPorId";
import { crearEmitirConstancia } from "./application/emitirConstancia";
import {
  configurarFirmaDePrueba,
  titularConResidenciaVigente,
} from "./constanciaDePrueba";
import { contadorDeFoliosSql } from "./infrastructure/contadorDeFoliosSql";
import { crearLectorDeDireccionesPorTerritorio } from "./infrastructure/lectorDeDireccionesPorTerritorio";
import { crearLectorDeTitularesPorPadron } from "./infrastructure/lectorDeTitularesPorPadron";
import { repositorioDeConstanciasSql } from "./infrastructure/repositorioDeConstanciasSql";
import { repositorioDeDocumentosSql } from "./infrastructure/repositorioDeDocumentosSql";

/**
 * El snapshot congelado (design.md de `constancias-oficios`, seccion 5):
 * comportamiento, no implementacion. Emitir, mutar lo que el snapshot
 * denormaliza, releer -y su reimpresion futura, via `constanciaPorId`- y
 * comparar caracter por caracter.
 */

let gente: GentePorMunicipio;

const actor = (rol: Parameters<typeof contextoDe>[2]) =>
  contextoDe(gente, "motul", rol);

const emitirConstancia = crearEmitirConstancia(
  repositorioDeConstanciasSql,
  contadorDeFoliosSql,
  repositorioDeDocumentosSql,
  crearLectorDeTitularesPorPadron,
  crearLectorDeDireccionesPorTerritorio,
);
const constanciaPorId = crearConstanciaPorId(repositorioDeConstanciasSql);

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
});

beforeEach(async () => {
  await owner`TRUNCATE folios_de_documentos, constancias, reimpresiones`;
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("el snapshot no se re-deriva en ninguna lectura posterior", () => {
  it("reparentear la colonia del titular no cambia el texto de la constancia, ni el de una reimpresion futura", async () => {
    const admin = actor("ADMIN_MUNICIPAL");
    const { personaId, lugarId } = await titularConResidenciaVigente(
      "Reparenteo",
      admin,
    );
    await configurarFirmaDePrueba(admin);

    const id = await emitirConstancia(personaId, actor("OPERADOR"));
    const antesDelReparenteo = await constanciaPorId(id, admin);
    expect(antesDelReparenteo?.datos).toEqual(
      expect.objectContaining({
        direccion: expect.objectContaining({
          texto: expect.stringContaining("Colonia de Reparenteo"),
        }),
      }),
    );

    const { id: comisariaId } = await altaDeLugar(
      { tipo: "comisaria", nombre: "Comisaria destino", padreId: null },
      admin,
    );
    await reparentearLugar(comoLugarId(lugarId), comisariaId, admin);

    const despuesDelReparenteo = await constanciaPorId(id, admin);

    // "Y su reimpresion futura": `constanciaPorId` es exactamente lo que
    // alimenta el render de una reimpresion (design.md seccion 11) -no hay
    // una segunda lectura que probar, el snapshot es el mismo objeto en
    // los dos caminos.
    expect(despuesDelReparenteo?.datos).toEqual(antesDelReparenteo?.datos);
  });

  it("fusionar la identidad del titular en padron no cambia el nombre impreso en la constancia ya emitida", async () => {
    const admin = actor("ADMIN_MUNICIPAL");
    const { personaId } = await titularConResidenciaVigente(
      "Correccion",
      admin,
    );
    await configurarFirmaDePrueba(admin);

    const id = await emitirConstancia(personaId, actor("OPERADOR"));
    const antesDeFusionar = await constanciaPorId(id, admin);
    expect(antesDeFusionar).not.toBeNull();
    const datosOriginales = antesDeFusionar?.datos as {
      titular: { nombreCompleto: string };
    };
    expect(datosOriginales.titular.nombreCompleto).toBe("Correccion Poot");

    const lector = crearLectorDeTitularesPorPadron(admin);
    const { id: sustitutoId } = await altaDePersona(
      {
        nombres: "Correccion",
        primerApellido: "ApellidoCorregido",
        segundoApellido: null,
        curp: null,
      },
      admin,
    );
    await fusionarPersonas(comoPersonaId(personaId), sustitutoId, admin);

    // El padron si cambio: el `id` del titular ahora resuelve al sustituto.
    // Si la constancia re-derivara su titular, el nombre impreso cambiaria.
    expect((await lector.porId(personaId))?.nombreCompleto).toBe(
      "Correccion ApellidoCorregido",
    );
    const despuesDeFusionar = await constanciaPorId(id, admin);
    expect(despuesDeFusionar?.datos).toEqual(antesDeFusionar?.datos);
  });
});
