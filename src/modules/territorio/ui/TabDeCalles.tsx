import { Plus } from "@phosphor-icons/react/ssr";
import {
  AvisoDePermiso,
  CeldaDeDato,
  CeldaPrincipal,
  EnlaceDeAccion,
  EstadoVacio,
  FilaDeTabla,
  Tabla,
} from "@/shared/ui";
import { puedeTenerCatalogoDeCalles } from "../domain";
import { CatalogoHeredado } from "./CatalogoHeredado";
import { type PropsDeContenido, rutaDe } from "./contenido";
import { FormularioDeAltaDeCalle } from "./FormularioDeAltaDeCalle";
import { BarraDeAcciones, PanelDeAccion } from "./PanelDeAccion";
import { PanelDeCalle } from "./PanelDeCalle";
import { puedeAbrir } from "./permisos";
import { COLUMNAS_DE_CALLES, formatoDePunto } from "./vistaDeCalles";

/**
 * Pestana Calles: el catalogo del asentamiento, el alta de una nueva calle
 * y el renombre de una existente.
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
  if (!puedeTenerCatalogoDeCalles(lugar.tipo)) {
    return (
      <CatalogoHeredado
        raizId={raizId}
        calles={calles}
        lugares={lugares}
        permisos={permisos}
      />
    );
  }

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
      {!puedeAgregar && !calleSeleccionada ? (
        <AvisoDePermiso
          capacidad="administrar la estructura territorial"
          requisito="el rol de administrador municipal"
        />
      ) : null}

      {puedeAgregar && !abierta ? (
        <BarraDeAcciones>
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
        <Tabla
          etiqueta={`Calles de ${lugar.nombre}`}
          columnas={COLUMNAS_DE_CALLES}
        >
          {calles.map((calle) => (
            <FilaDeTabla
              key={calle.id}
              href={rutaDe({
                raizId: raizId,
                nodoId: lugar.id,
                vista: "calles",
                calleId: calle.id,
              })}
              etiquetaAccesible={`${calle.nombre}, ${formatoDePunto(calle.punto)}`}
            >
              <CeldaPrincipal>{calle.nombre}</CeldaPrincipal>
              <CeldaDeDato>{formatoDePunto(calle.punto)}</CeldaDeDato>
            </FilaDeTabla>
          ))}
        </Tabla>
      ) : (
        <EstadoVacio
          estado={{ clase: "vacio-inicial" }}
          mensajeInicial={`${lugar.nombre} no tiene calles todavía. Un domicilio necesita una.`}
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
