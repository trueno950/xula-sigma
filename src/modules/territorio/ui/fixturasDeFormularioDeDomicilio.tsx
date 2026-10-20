import { renderToStaticMarkup } from "react-dom/server";
import type { NodoDeSubarbol } from "../application/puertos";
import { comoCalleId, comoLugarId } from "../domain";
import { FormularioDeDomicilio } from "./FormularioDeDomicilio";
import { opcionesDeCalles } from "./opciones";
import { lugaresDeNodos } from "./vistaDeDomicilios";
import { zonaDelFormulario } from "./zonaDelFormulario";

/**
 * Fixturas del formulario de alta de domicilio, compartidas por
 * `formularioDeDomicilio.test.tsx` (orden de campos y zona) y
 * `formularioDeDomicilio.campos.test.tsx` (grupos, calles y buscador), mismo
 * reparto que `fixturasDeDomiciliosU5.tsx`.
 */
export const cabeceraId = comoLugarId("11111111-1111-4111-8111-111111111111");
export const coloniaId = comoLugarId("22222222-2222-4222-8222-222222222222");
export const sectorId = comoLugarId("33333333-3333-4333-8333-333333333333");
export const manzanaId = comoLugarId("44444444-4444-4444-8444-444444444444");

export const nodos: readonly NodoDeSubarbol[] = [
  {
    clase: "lugar",
    id: coloniaId,
    tipo: "colonia",
    nombre: "Pablo",
    padreId: cabeceraId,
  },
  {
    clase: "lugar",
    id: sectorId,
    tipo: "sector",
    nombre: "2",
    padreId: coloniaId,
  },
  {
    clase: "lugar",
    id: manzanaId,
    tipo: "manzana",
    nombre: "San Pedro",
    padreId: sectorId,
  },
];

export const calles = [
  {
    id: comoCalleId("55555555-5555-4555-8555-555555555555"),
    nombre: "Calle 21",
    lugarId: cabeceraId,
    punto: null,
  },
];

export const renderFormulario = (
  lugar: {
    id: typeof cabeceraId;
    tipo: "cabecera" | "manzana";
    nombre: string;
  },
  contexto?: { raiz: string; nodo: string },
) =>
  renderToStaticMarkup(
    <FormularioDeDomicilio
      calles={opcionesDeCalles(calles)}
      zona={zonaDelFormulario(
        lugaresDeNodos(nodos),
        { id: cabeceraId, nombre: "Tepakan" },
        lugar,
      )}
      raiz={contexto?.raiz}
      nodo={contexto?.nodo}
    />,
  );
