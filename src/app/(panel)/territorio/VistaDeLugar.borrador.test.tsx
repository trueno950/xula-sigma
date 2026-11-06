import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { CalleId, LugarId } from "@/modules/territorio";
import type { BorradorDeDomicilio } from "@/modules/territorio/ui/borradorDeDomicilio";
import { permisosDeTerritorio } from "@/modules/territorio/ui/permisos";

// Los stubs de nodo y contenido: el motivo esta en `page.test.tsx`.
vi.mock("@/modules/territorio", () => ({
  PanelDeNodo: () => null,
  ContenidoDeLugar: ({
    borrador,
  }: {
    borrador?: BorradorDeDomicilio | null;
  }) => <div data-borrador={borrador?.token ?? "ninguno"} />,
}));

const { VistaDeLugar } = await import("./VistaDeLugar");

const RAIZ = "11111111-1111-4111-8111-111111111111" as LugarId;
const CALLE = "22222222-2222-4222-8222-222222222222" as CalleId;
const TOKEN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const borrador: BorradorDeDomicilio = {
  token: TOKEN,
  destino: { formulario: "alta" },
  campos: {
    calleId: CALLE,
    zonaId: "",
    numero: "88-B",
    entreCalleAId: "",
    entreCalleBId: "",
    referencia: "",
  },
};

const lugar = { id: RAIZ, tipo: "cabecera" as const, nombre: "Tepakan" };

describe("La vista de lugar con un borrador", () => {
  it("lo pasa al contenido, donde vive la correccion, y al alta del lugar", () => {
    const html = renderToStaticMarkup(
      <VistaDeLugar
        raiz={lugar}
        nodos={[{ clase: "lugar", ...lugar, padreId: null }]}
        nodo={lugar}
        calles={[{ id: CALLE, nombre: "Calle 20", lugarId: RAIZ, punto: null }]}
        lugares={[lugar]}
        vista="domicilios"
        accion="domicilio"
        calleId={undefined}
        domicilioId={undefined}
        domicilio={undefined}
        permisos={permisosDeTerritorio("OPERADOR")}
        domicilioAbierto
        borrador={borrador}
      />,
    );

    expect(html).toContain(`data-borrador="${TOKEN}"`);
    expect(html).toContain('value="88-B"');
  });
});
