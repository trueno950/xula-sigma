import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { CalleId, DomicilioId, LugarId } from "@/modules/territorio";
import { permisosDeTerritorio } from "@/modules/territorio/ui/permisos";

// Los stubs de nodo y contenido: el motivo esta en `page.test.tsx`.
vi.mock("@/modules/territorio", () => ({
  PanelDeNodo: () => <div data-panel />,
  ContenidoDeLugar: ({ vista }: { vista: string }) => (
    <div data-contenido-vista={vista} />
  ),
}));

const { VistaDeLugar } = await import("./VistaDeLugar");

const RAIZ = "11111111-1111-4111-8111-111111111111" as LugarId;
const CALLE = "22222222-2222-4222-8222-222222222222" as CalleId;
const DOMICILIO = "44444444-4444-4444-8444-444444444444" as DomicilioId;

const vista = (accion: "corregirDomicilio" | undefined) =>
  renderToStaticMarkup(
    <VistaDeLugar
      raiz={{ id: RAIZ, tipo: "cabecera", nombre: "Tepakan" }}
      nodos={[]}
      nodo={{ id: RAIZ, tipo: "cabecera", nombre: "Tepakan" }}
      calles={[{ id: CALLE, nombre: "Calle 20", lugarId: RAIZ, punto: null }]}
      lugares={[{ id: RAIZ, nombre: "Tepakan", tipo: "cabecera" }]}
      vista="domicilios"
      accion={accion}
      calleId={undefined}
      domicilioId={DOMICILIO}
      domicilio={{
        id: DOMICILIO,
        lugarId: RAIZ,
        calleId: CALLE,
        numero: "103",
        entreCalleAId: null,
        entreCalleBId: null,
        referencia: null,
        bajaEn: null,
      }}
      permisos={permisosDeTerritorio("OPERADOR")}
      domicilioAbierto={false}
    />,
  );

/** S2 de `territorio-formularios`: la correccion ocupa la pestana entera. */
describe("La vista de lugar con la correccion abierta", () => {
  it("no ofrece el alta de domicilio encima de la correccion", () => {
    expect(vista("corregirDomicilio")).not.toContain("Registrar domicilio");
  });

  it("con el panel del domicilio el alta sigue a mano", () => {
    expect(vista(undefined)).toContain("Registrar domicilio");
  });
});
