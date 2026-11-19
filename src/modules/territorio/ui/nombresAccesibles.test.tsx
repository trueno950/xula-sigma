import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { NodoDeSubarbol } from "../application/puertos";
import { comoCalleId, comoLugarId } from "../domain";
import { AccionesDeLugar } from "./AccionesDeLugar";
import type { PropsDeContenido } from "./contenido";
import { permisosDeTerritorio } from "./permisos";
import { TabDeCalles } from "./TabDeCalles";
import { TabDeLugares } from "./TabDeLugares";
import { VistaDeRaices } from "./VistaDeRaices";

const raizId = comoLugarId("11111111-1111-4111-8111-111111111111");
const hijoId = comoLugarId("22222222-2222-4222-8222-222222222222");

const hijo: NodoDeSubarbol = {
  clase: "lugar",
  id: hijoId,
  tipo: "comisaria",
  nombre: "Kantirix",
  padreId: raizId,
};

const base: PropsDeContenido = {
  raizId,
  lugar: { id: raizId, tipo: "cabecera", nombre: "Motul" },
  nodos: [hijo],
  calles: [
    {
      id: comoCalleId("33333333-3333-4333-8333-333333333333"),
      nombre: "Calle 20",
      lugarId: raizId,
      punto: null,
    },
  ],
  lugares: [],
  calleId: undefined,
  domicilio: undefined,
  domicilioId: undefined,
  accion: undefined,
  permisos: permisosDeTerritorio("ADMIN_MUNICIPAL"),
};

describe("nombres accesibles de las filas y acciones", () => {
  it("la fila de un lugar separa el nombre del tipo", () => {
    const html = renderToStaticMarkup(<TabDeLugares {...base} />);

    expect(html).toContain('aria-label="Kantirix, comisaría"');
    expect(html).not.toContain(">comisaria<");
  });

  it("la fila de una calle separa el nombre de la ubicacion", () => {
    const html = renderToStaticMarkup(<TabDeCalles {...base} />);

    expect(html).toContain('aria-label="Calle 20, Sin ubicar"');
  });

  /**
   * S3 de `territorio-ux`: las acciones del lugar son pliegues, asi que su
   * nombre accesible es la etiqueta visible del `<summary>`, y el cuerpo
   * sigue diciendo que hace cada una.
   */
  it("cada pliegue del lugar se anuncia con su etiqueta y su forma", () => {
    const html = renderToStaticMarkup(
      <AccionesDeLugar
        {...base}
        cuentas={{ lugares: 1, calles: 1, domicilios: 0 }}
      />,
    );

    expect(html).toContain(">Renombrar…<");
    expect(html).toContain(">Dar de baja…<");
    expect(html).toContain('name="accion" value="renombrar"');
  });

  it("la fila de una raiz separa el nombre del tipo", () => {
    const html = renderToStaticMarkup(
      <VistaDeRaices
        raices={[
          {
            id: raizId,
            tipo: "comisaria",
            nombre: "Kantirix",
            padreId: null,
          },
        ]}
        lugares={[]}
        hayCabecera={false}
        puedeEscribir
        altaAbierta={false}
      />,
    );

    expect(html).toContain('aria-label="Kantirix, comisaría"');
    expect(html).toContain(">Comisaría<");
  });
});
