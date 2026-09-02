import { PencilSimple, Plus } from "@phosphor-icons/react/ssr";
import {
  CeldaPrincipal,
  type ColumnaDeTabla,
  EnlaceDeAccion,
  FilaDeTabla,
  Tabla,
} from "@/shared/ui";
import { type PropsDeContenido, rutaDe } from "./contenido";
import { FormularioDeAltaDeCalle } from "./FormularioDeAltaDeCalle";
import { FormularioDeRenombreDeCalle } from "./FormularioDeRenombreDeCalle";
import { BarraDeAcciones, PanelDeAccion } from "./PanelDeAccion";

const COLUMNAS: readonly ColumnaDeTabla[] = [
  { clave: "calle", etiqueta: "Calle" },
];

/**
 * Pestana Calles: las calles del lugar, el alta de una nueva y el renombre
 * de una existente.
 *
 * Las filas no llevan enlace: una calle no tiene pantalla propia, y darles
 * hover prometia un clic que no llevaba a ningun lado. Antes eran chips
 * grises en una fila que se envolvia, que ademas escondia cuantas habia.
 */
export function TabDeCalles({
  raizId,
  lugar,
  calles,
  accion,
  puedeActuar,
}: PropsDeContenido) {
  const abierta = accion === "calle" || accion === "renombrarCalle";

  return (
    <div className="flex flex-col gap-4">
      {puedeActuar && !abierta ? (
        <BarraDeAcciones>
          {calles.length > 0 ? (
            <EnlaceDeAccion
              href={rutaDe({
                raizId: raizId,
                nodoId: lugar.id,
                vista: "calles",
                accion: "renombrarCalle",
              })}
            >
              <PencilSimple size={18} aria-hidden="true" />
              Renombrar calle
            </EnlaceDeAccion>
          ) : null}
          <EnlaceDeAccion
            href={rutaDe({
              raizId: raizId,
              nodoId: lugar.id,
              vista: "calles",
              accion: "calle",
            })}
            variante="primaria"
          >
            <Plus size={18} weight="bold" aria-hidden="true" />
            Agregar calle
          </EnlaceDeAccion>
        </BarraDeAcciones>
      ) : null}

      {calles.length > 0 ? (
        <Tabla etiqueta={`Calles de ${lugar.nombre}`} columnas={COLUMNAS}>
          {calles.map((calle) => (
            <FilaDeTabla key={calle.id}>
              <CeldaPrincipal>{calle.nombre}</CeldaPrincipal>
            </FilaDeTabla>
          ))}
        </Tabla>
      ) : (
        <p className="py-6 text-[15px] text-caliza-apagada">
          {lugar.nombre} no tiene calles todavia. Un domicilio necesita una.
        </p>
      )}

      {puedeActuar && accion === "calle" ? (
        <PanelDeAccion
          titulo={`Agregar una calle en ${lugar.nombre}`}
          volverA={rutaDe({
            raizId: raizId,
            nodoId: lugar.id,
            vista: "calles",
          })}
        >
          <FormularioDeAltaDeCalle raiz={raizId} nodo={lugar.id} />
        </PanelDeAccion>
      ) : null}

      {puedeActuar && accion === "renombrarCalle" ? (
        <PanelDeAccion
          titulo="Renombrar una calle"
          volverA={rutaDe({
            raizId: raizId,
            nodoId: lugar.id,
            vista: "calles",
          })}
        >
          <FormularioDeRenombreDeCalle
            raiz={raizId}
            nodo={lugar.id}
            calles={calles}
          />
        </PanelDeAccion>
      ) : null}
    </div>
  );
}
