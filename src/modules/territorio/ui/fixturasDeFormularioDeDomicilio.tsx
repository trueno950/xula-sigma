import { renderToStaticMarkup } from "react-dom/server";
import type { NodoDeSubarbol } from "../application/puertos";
import { comoCalleId, comoLugarId } from "../domain";
import { declaracionDeDestino } from "./declaracionDeDestino";
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

export const nodos: readonly NodoDeSubarbol[] = [
  {
    clase: "lugar",
    id: coloniaId,
    tipo: "colonia",
    nombre: "Pablo",
    padreId: cabeceraId,
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
    tipo: "cabecera" | "colonia";
    nombre: string;
  },
  contexto?: { raiz: string; nodo: string },
) => {
  const zona = zonaDelFormulario(
    lugaresDeNodos(nodos),
    { id: cabeceraId, nombre: "Tepakan" },
    lugar,
  );

  return renderToStaticMarkup(
    <FormularioDeDomicilio
      calles={opcionesDeCalles(calles)}
      zona={zona}
      declaracionDeDestino={declaracionDeDestino({
        origen: "lugar",
        tipo: lugar.tipo,
        nombre: lugar.nombre,
        asentamiento: "Tepakan",
        tieneColonias: !zona.sinZonas,
      })}
      raiz={contexto?.raiz}
      nodo={contexto?.nodo}
    />,
  );
};
