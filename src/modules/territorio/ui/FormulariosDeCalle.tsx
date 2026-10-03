import type { LugarGuardado } from "../application/puertos";
import type { LugarId } from "../domain";
import { FormularioDeBajaDeCalle } from "./FormularioDeBajaDeCalle";
import { FormularioDeMovimientoDeCalle } from "./FormularioDeMovimientoDeCalle";
import { FormularioDeRenombreDeCalle } from "./FormularioDeRenombreDeCalle";
import { FormularioDeUbicacion } from "./FormularioDeUbicacion";
import type { AccionDeCalle } from "./tipoDeAccionDeCalle";
import type { CalleParaPanel } from "./vistaDeCalles";

export type DatosDeFormularioDeCalle = {
  raizId: LugarId;
  nodoId: LugarId;
  calle: CalleParaPanel;
  lugares: readonly Pick<LugarGuardado, "id" | "nombre" | "tipo">[];
};

/** El formulario de una accion, para pintarlo dentro de su propio detalle. */
export function FormularioDeAccionDeCalle({
  accion,
  datos,
}: {
  accion: AccionDeCalle;
  datos: DatosDeFormularioDeCalle;
}) {
  const { raizId, nodoId, calle, lugares } = datos;

  if (accion === "ubicarCalle") {
    return <FormularioDeUbicacion raiz={raizId} nodo={nodoId} calle={calle} />;
  }
  if (accion === "renombrarCalle") {
    return (
      <FormularioDeRenombreDeCalle raiz={raizId} nodo={nodoId} calle={calle} />
    );
  }
  if (accion === "reparentearCalle") {
    return (
      <FormularioDeMovimientoDeCalle
        raiz={raizId}
        nodo={nodoId}
        calle={calle}
        lugares={lugares}
      />
    );
  }
  return <FormularioDeBajaDeCalle raiz={raizId} nodo={nodoId} calle={calle} />;
}
