import { describe, expect, it } from "vitest";
import { navegacionDe, rutaDelArbol } from "./volverAlArbol";

/**
 * La ruta a la que vuelven las acciones de territorio.
 *
 * Se prueba aparte del `redirect` porque el destino es lo unico que tiene
 * decisiones: que parametro se escribe, cual se omite y que pasa cuando no
 * queda ninguno. Llamar a `redirect` seria probar a Next.
 */
describe("rutaDelArbol", () => {
  it("sin raiz ni nodo va al listado, sin `?` colgando", () => {
    expect(rutaDelArbol({})).toBe("/territorio");
  });

  it("omite el nodo cuando no hay, en vez de escribirlo vacio", () => {
    expect(rutaDelArbol({ raiz: "r1" })).toBe("/territorio?raiz=r1");
  });

  it("escribe raiz y nodo cuando estan los dos", () => {
    expect(rutaDelArbol({ raiz: "r1", nodo: "n1" })).toBe(
      "/territorio?raiz=r1&nodo=n1",
    );
  });

  it("preserves the active territory context on an error redirect", () => {
    const contexto = {
      raiz: "r1",
      nodo: "n1",
      vista: "calles",
      accion: "renombrarCalle",
      calle: "c1",
      error: "No se pudo guardar",
    };

    expect(rutaDelArbol(contexto)).toBe(
      "/territorio?raiz=r1&nodo=n1&vista=calles&accion=renombrarCalle&calle=c1&error=No+se+pudo+guardar",
    );
  });

  /**
   * El panel de un domicilio abierto es contexto igual que `calle`: sin el
   * id, el error devuelve al operador al listado y lo obliga a volver a
   * buscar la direccion que estaba corrigiendo.
   */
  it("escribe el domicilio abierto en el destino", () => {
    expect(
      rutaDelArbol({
        raiz: "r1",
        nodo: "n1",
        vista: "domicilios",
        accion: "bajaDomicilio",
        domicilio: "d1",
        error: "No se pudo",
      }),
    ).toBe(
      "/territorio?raiz=r1&nodo=n1&vista=domicilios&accion=bajaDomicilio&domicilio=d1&error=No+se+pudo",
    );
  });

  /**
   * El mensaje viaja en la query y lo escribe el servidor, pero pasa por
   * `URLSearchParams`: sin escapar, un `&` adentro del texto partia el
   * mensaje en dos parametros.
   */
  it("escapa el mensaje de error", () => {
    expect(rutaDelArbol({ raiz: "r1", error: "Falla A & B" })).toBe(
      "/territorio?raiz=r1&error=Falla+A+%26+B",
    );
  });
});

describe("navegacionDe", () => {
  const conCampos = (campos: Record<string, string>) => {
    const formData = new FormData();
    for (const [clave, valor] of Object.entries(campos)) {
      formData.set(clave, valor);
    }

    return formData;
  };

  const RAIZ = "11111111-1111-4111-8111-111111111111";
  const NODO = "22222222-2222-4222-8222-222222222222";
  const PADRE = "33333333-3333-4333-8333-333333333333";
  const CALLE = "44444444-4444-4444-8444-444444444444";
  const DOMICILIO = "55555555-5555-4555-8555-555555555555";

  it("reads the complete active territory context", () => {
    expect(
      navegacionDe(
        conCampos({
          raiz: RAIZ,
          nodo: NODO,
          vista: "calles",
          accion: "renombrarCalle",
          calle: CALLE,
          padre: PADRE,
        }),
      ),
    ).toEqual({
      raiz: RAIZ,
      nodo: NODO,
      vista: "calles",
      accion: "renombrarCalle",
      calle: CALLE,
      padre: PADRE,
    });
  });

  /**
   * Las dos acciones de domicilio mandan `accion` y `domicilioId` en campos
   * ocultos. Mientras el esquema no las conocia, `.catch(undefined)` las
   * descartaba en silencio y todo error las devolvia al listado pelado.
   */
  it.each(["corregirDomicilio", "bajaDomicilio"])(
    "preserva el panel abierto de %s",
    (accion) => {
      expect(
        navegacionDe(
          conCampos({
            raiz: RAIZ,
            nodo: NODO,
            vista: "domicilios",
            accion,
            domicilioId: DOMICILIO,
          }),
        ),
      ).toEqual({
        raiz: RAIZ,
        nodo: NODO,
        vista: "domicilios",
        accion,
        domicilio: DOMICILIO,
      });
    },
  );

  it("un campo vacio vale lo mismo que uno ausente", () => {
    expect(navegacionDe(conCampos({ raiz: "", nodo: NODO }))).toEqual({
      raiz: undefined,
      nodo: NODO,
      padre: undefined,
    });
  });

  /**
   * El campo lo escribe quien manda el formulario. Un `padre` falseado
   * elegiria a donde cae el operador despues de una baja exitosa; sin UUID
   * el destino cae al listado, que siempre existe.
   */
  it("descarta lo que no es un UUID en vez de llevarlo al destino", () => {
    expect(
      navegacionDe(
        conCampos({ raiz: RAIZ, nodo: NODO, padre: "../../otra-cosa" }),
      ),
    ).toEqual({ raiz: RAIZ, nodo: NODO, padre: undefined });
  });

  it("un campo invalido no arrastra a los demas", () => {
    expect(navegacionDe(conCampos({ raiz: "no-es-uuid", nodo: NODO }))).toEqual(
      { raiz: undefined, nodo: NODO, padre: undefined },
    );
  });
});
