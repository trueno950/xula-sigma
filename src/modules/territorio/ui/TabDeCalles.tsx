import { Plus } from "@phosphor-icons/react/ssr";
import {
  CeldaDeDato,
  CeldaPrincipal,
  type ColumnaDeTabla,
  EnlaceDeAccion,
  EstadoVacio,
  FilaDeTabla,
  Tabla,
} from "@/shared/ui";
import { type PropsDeContenido, rutaDe } from "./contenido";
import { FormularioDeAltaDeCalle } from "./FormularioDeAltaDeCalle";
import { BarraDeAcciones, PanelDeAccion } from "./PanelDeAccion";
import { PanelDeCalle } from "./PanelDeCalle";
import { puedeAbrir } from "./permisos";
import { formatoDePunto } from "./vistaDeCalles";

const COLUMNAS: readonly ColumnaDeTabla[] = [
  { clave: "calle", etiqueta: "Calle" },
  { clave: "ubicacion", etiqueta: "Ubicacion" },
];

/**
 * Pestana Calles: las calles del lugar, el alta de una nueva y el renombre
 * de una existente.
 *
 * Cada fila abre el panel de la calle: ahora concentra ubicacion, renombre,
 * movimiento y baja sin inventar una segunda lista para elegirla.
 */
export function TabDeCalles({
  raizId,
  lugar,
  calles,
  lugares,
  accion,
  permisos,
  calleId,
}: PropsDeContenido) {
  const abierta =
    accion === "calle" ||
    accion === "renombrarCalle" ||
    accion === "ubicarCalle" ||
    accion === "reparentearCalle" ||
    accion === "bajaCalle";
  const puedeAgregar = puedeAbrir("calle", permisos);
  const calleSeleccionada = calleId
    ? calles.find((calle) => calle.id === calleId)
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      {puedeAgregar && !abierta ? (
        <BarraDeAcciones>
          {puedeAgregar ? (
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
          ) : null}
        </BarraDeAcciones>
      ) : null}

      {calles.length > 0 ? (
        <Tabla etiqueta={`Calles de ${lugar.nombre}`} columnas={COLUMNAS}>
          {calles.map((calle) => (
            <FilaDeTabla
              key={calle.id}
              href={rutaDe({
                raizId: raizId,
                nodoId: lugar.id,
                vista: "calles",
                calleId: calle.id,
              })}
            >
              <CeldaPrincipal>{calle.nombre}</CeldaPrincipal>
              <CeldaDeDato>{formatoDePunto(calle.punto)}</CeldaDeDato>
            </FilaDeTabla>
          ))}
        </Tabla>
      ) : (
        <EstadoVacio
          estado={{ clase: "vacio-inicial" }}
          mensajeInicial={`${lugar.nombre} no tiene calles todavia. Un domicilio necesita una.`}
          accion={
            puedeAgregar ? (
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
            ) : undefined
          }
          hrefSinFiltro={rutaDe({
            raizId: raizId,
            nodoId: lugar.id,
            vista: "calles",
          })}
        />
      )}

      {puedeAgregar && accion === "calle" ? (
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

      {calleSeleccionada ? (
        <PanelDeCalle
          raizId={raizId}
          nodoId={lugar.id}
          calle={calleSeleccionada}
          lugares={lugares}
          accion={accion}
          permisos={permisos}
        />
      ) : null}
    </div>
  );
}
