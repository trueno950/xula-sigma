import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { limpiar, owner, sembrar } from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import type { NodoDeSubarbol } from "./application/puertos";
import { crearSubarbol } from "./application/subarbol";
import type { LugarId } from "./domain";
import { repositorioDeLugaresSql } from "./infrastructure/repositorioDeLugaresSql";
import {
  contextoDe,
  crearCalle,
  crearDomicilioEnCalle,
  crearLugar,
} from "./lugarDePrueba";

type NodoDomicilio = Extract<NodoDeSubarbol, { clase: "domicilio" }>;

const subarbol = crearSubarbol(repositorioDeLugaresSql);

const domiciliosDe = (
  nodos: readonly NodoDeSubarbol[],
): readonly NodoDomicilio[] =>
  nodos.filter((nodo): nodo is NodoDomicilio => nodo.clase === "domicilio");

/**
 * Una sola cabecera para todo el archivo: `lugares_una_cabecera` admite una
 * por municipio. Cada prueba cuelga su propia calle, con nombre propio, y
 * filtra por ella -el subarbol no promete orden entre sus filas-.
 */
let cabecera: LugarId;

beforeAll(async () => {
  await sembrar();
  cabecera = await crearLugar("cabecera", "Cabecera");
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

/**
 * El invariante del que depende `hermanos` acotado al subarbol
 * (`ui/contenido.ts`, `hermanosDeDireccion`): todo domicilio de una calle
 * cuelga del subarbol del asentamiento de esa calle.
 *
 * Lo sostiene `verificacionDeDomicilio.ts` (`exigirCallesDelAsentamiento`:
 * la cadena de `lugarId` sube hasta el lugar que tiene catalogo de calles, y
 * las tres calles tienen que ser de ese lugar), y el registro solo abre un
 * asentamiento como `?raiz=` (`listarRaices` = `padreId IS NULL`). Sin este
 * test, acotar `hermanos` al subarbol seria una afirmacion sin respaldo.
 */
describe("subarbol de un asentamiento: los domicilios de su calle", () => {
  it("trae los de la calle, cuelguen del asentamiento o de una colonia suya", async () => {
    const colonia = await crearLugar("colonia", "Centro", cabecera);
    const calle = await crearCalle(cabecera, "Calle 21");
    const enElAsentamiento = await crearDomicilioEnCalle(cabecera, calle, "5");
    const enLaColonia = await crearDomicilioEnCalle(colonia, calle, "5");

    const nodos = await subarbol(cabecera, contextoDe());
    const ids = domiciliosDe(nodos).map((nodo) => nodo.id);

    expect(ids).toContain(enElAsentamiento);
    expect(ids).toContain(enLaColonia);
  });

  it("cada nodo de domicilio trae su calle, su calleId y su numero", async () => {
    const calle = await crearCalle(cabecera, "Calle 23");
    const creado = await crearDomicilioEnCalle(cabecera, calle, "7");

    const nodos = await subarbol(cabecera, contextoDe());
    const [domicilio] = domiciliosDe(nodos).filter(
      (nodo) => nodo.id === creado,
    );

    expect(domicilio).toMatchObject({
      calle: "Calle 23",
      calleId: calle,
      numero: "7",
      lugarId: cabecera,
    });
  });

  it("un domicilio sin numero viaja con numero nulo, no con cadena vacia", async () => {
    const calle = await crearCalle(cabecera, "Calle 25");
    const creado = await crearDomicilioEnCalle(cabecera, calle);

    const nodos = await subarbol(cabecera, contextoDe());
    const [domicilio] = domiciliosDe(nodos).filter(
      (nodo) => nodo.id === creado,
    );

    expect(domicilio?.numero).toBeNull();
  });
});
