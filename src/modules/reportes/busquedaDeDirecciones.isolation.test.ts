import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  altaDeCalle,
  altaDeDomicilio,
  altaDeLugar,
  type DomicilioId,
  darDeBajaDomicilio,
} from "@/modules/territorio";
import {
  contextoDe,
  type GentePorMunicipio,
  sembrarGente,
} from "@/shared/auth/genteDePrueba";
import { owner, sembrar } from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion } from "@/shared/tenancy/withTenant";
import { buscarDireccionesParaReporte } from "./composicion";
import { crearDomicilioConColonia } from "./direccionConColoniaDePrueba";

type Municipio = "motul" | "ticul";
let gente: GentePorMunicipio;
let domicilioMotul: DomicilioId;
let domicilioTicul: DomicilioId;
let domicilioInactivo: DomicilioId;
const consulta = "Calle busqueda aislada T6b";

const actor = (municipio: Municipio) =>
  contextoDe(gente, municipio, "ADMIN_MUNICIPAL");

const crearDomicilio = async (opciones: {
  municipio: Municipio;
  nombre: string;
  nombreDeCalle?: string;
  numero?: string;
}) => {
  const {
    municipio,
    nombre,
    nombreDeCalle = consulta,
    numero = "82",
  } = opciones;
  const contexto = actor(municipio);
  const { id: lugarId } = await altaDeLugar(
    { tipo: "comisaria", nombre, padreId: null },
    contexto,
  );
  const { id: calleId } = await altaDeCalle(
    { nombre: nombreDeCalle, lugarId },
    contexto,
  );
  const { id } = await altaDeDomicilio(
    {
      lugarId,
      calleId,
      numero,
      entreCalleAId: null,
      entreCalleBId: null,
      referencia: null,
    },
    contexto,
  );
  return id;
};

beforeAll(async () => {
  await sembrar();
  gente = await sembrarGente();
  domicilioMotul = await crearDomicilio({
    municipio: "motul",
    nombre: "Domicilio propio T6b",
  });
  domicilioTicul = await crearDomicilio({
    municipio: "ticul",
    nombre: "Domicilio ajeno T6b",
  });
  domicilioInactivo = await crearDomicilio({
    municipio: "motul",
    nombre: "Domicilio inactivo T6b",
  });
  await darDeBajaDomicilio(domicilioInactivo, actor("motul"));
});

afterAll(async () => {
  await owner.end();
  await cerrarConexion();
});

describe("busqueda de direcciones para reportes", () => {
  it("solo devuelve direcciones del tenant autenticado", async () => {
    const propio = await buscarDireccionesParaReporte(consulta, actor("motul"));
    const ajeno = await buscarDireccionesParaReporte(consulta, actor("ticul"));

    expect(propio.opciones.map(({ id }) => id)).toContain(domicilioMotul);
    expect(propio.opciones.map(({ id }) => id)).not.toContain(domicilioTicul);
    expect(ajeno.opciones.map(({ id }) => id)).toContain(domicilioTicul);
    expect(ajeno.opciones.map(({ id }) => id)).not.toContain(domicilioMotul);
    expect(
      propio.opciones.map(({ etiqueta }) => etiqueta).join("\n"),
    ).not.toContain("Domicilio ajeno T6b");
    expect(
      ajeno.opciones.map(({ etiqueta }) => etiqueta).join("\n"),
    ).not.toContain("Domicilio propio T6b");
  });

  it("busca calle, numero, colonia y asentamiento, y conserva el numero en la etiqueta", async () => {
    const direccion = await crearDomicilioConColonia(actor("motul"));
    for (const termino of [
      "Calle buscable T6b",
      "42-B",
      "Colonia buscable T6b",
      "Asentamiento buscable T6b",
    ]) {
      const resultado = await buscarDireccionesParaReporte(
        termino,
        actor("motul"),
      );
      expect(resultado.opciones.map(({ id }) => id)).toContain(direccion.id);
    }

    const resultado = await buscarDireccionesParaReporte(
      "Calle buscable T6b",
      actor("motul"),
    );
    expect(resultado.opciones[0]).toEqual({
      id: direccion.id,
      etiqueta:
        "Calle buscable T6b #42-B, Colonia buscable T6b, Asentamiento buscable T6b",
      lugarId: direccion.coloniaId,
    });
  });
  it("excluye domicilios inactivos y trata comodines como texto literal", async () => {
    const literal = await crearDomicilio({
      municipio: "motul",
      nombre: "Direccion literal T6b",
      nombreDeCalle: "Calle %_ literal",
      numero: "1",
    });
    const comodin = await crearDomicilio({
      municipio: "motul",
      nombre: "Direccion comodin T6b",
      nombreDeCalle: "Calle AB literal",
      numero: "1",
    });
    const busquedaComun = await buscarDireccionesParaReporte(
      "Calle busqueda aislada T6b",
      actor("motul"),
    );
    const busquedaLiteral = await buscarDireccionesParaReporte(
      "%_ literal",
      actor("motul"),
    );
    expect(busquedaComun.opciones.map(({ id }) => id)).not.toContain(
      domicilioInactivo,
    );
    expect(busquedaLiteral.opciones.map(({ id }) => id)).toContain(literal);
    expect(busquedaLiteral.opciones.map(({ id }) => id)).not.toContain(comodin);
  });

  it("limita resultados e indica que hay más coincidencias", async () => {
    for (let indice = 0; indice < 16; indice += 1) {
      await crearDomicilio({
        municipio: "motul",
        nombre: `Domicilio limite T6b ${indice}`,
        nombreDeCalle: "Calle limite T6b",
        numero: String(indice + 1),
      });
    }

    const resultado = await buscarDireccionesParaReporte(
      "Calle limite T6b",
      actor("motul"),
    );
    expect(resultado.opciones).toHaveLength(15);
    expect(resultado.hayMas).toBe(true);
    expect(new Set(resultado.opciones.map(({ id }) => id)).size).toBe(15);
  });
});
