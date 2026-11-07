import { renderToStaticMarkup } from "react-dom/server";
import { comoCalleId, comoLugarId } from "../domain";
import type { PropsDeContenido } from "./contenido";
import type { AccionDeNodo } from "./PanelDeNodo";
import { permisosDeTerritorio } from "./permisos";
import { TabDeCalles } from "./TabDeCalles";
import type { CalleParaPanel } from "./vistaDeCalles";

/**
 * El catalogo y el render de la pestana Calles que comparten
 * `callesU4.test.tsx` y `accionesDeCalleU4.test.tsx`. Los `vi.mock` de las
 * acciones van en cada test: Vitest solo los eleva dentro del archivo de test.
 */
export const raizId = comoLugarId("11111111-1111-4111-8111-111111111111");
export const sinPunto: CalleParaPanel = {
  id: comoCalleId("33333333-3333-4333-8333-333333333333"),
  nombre: "Calle 21",
  lugarId: raizId,
  punto: null,
};
export const conPunto: CalleParaPanel = {
  id: comoCalleId("44444444-4444-4444-8444-444444444444"),
  nombre: "Calle 15",
  lugarId: raizId,
  punto: { latitud: 20.9, longitud: -89.6 },
};
export const lugar = {
  id: raizId,
  tipo: "cabecera" as const,
  nombre: "Buenavista",
};

type Opciones = {
  seleccionada?: CalleParaPanel | undefined;
  accion?: AccionDeNodo | undefined;
  rol?: "ADMIN_MUNICIPAL" | "OPERADOR";
};

export const otroAsentamientoId = comoLugarId(
  "77777777-7777-4777-8777-777777777777",
);

export const renderTab = ({
  seleccionada,
  accion,
  rol = "ADMIN_MUNICIPAL",
}: Opciones = {}) => {
  const props: PropsDeContenido = {
    raizId,
    lugar,
    nodos: [],
    calles: [sinPunto, conPunto],
    // Un segundo asentamiento: sin el, Mover no tiene a donde ir y no se ofrece.
    lugares: [
      { id: raizId, nombre: "Buenavista", tipo: "cabecera" },
      { id: otroAsentamientoId, nombre: "Kiní", tipo: "comisaria" },
    ],
    calleId: seleccionada?.id,
    domicilio: undefined,
    domicilioId: undefined,
    accion,
    permisos: permisosDeTerritorio(rol),
  };
  return renderToStaticMarkup(<TabDeCalles {...props} />);
};

export const panelDe = (h: string) =>
  h.slice(h.indexOf('id="panel-de-calle"'), h.indexOf("</nav>"));
export const detalles = (html: string) =>
  html.match(/<details[^>]*>/g) ?? ([] as string[]);
