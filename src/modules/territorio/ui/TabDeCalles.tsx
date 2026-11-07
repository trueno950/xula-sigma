import { Plus } from "@phosphor-icons/react/ssr";
import { AvisoDePermiso, EnlaceDeAccion } from "@/shared/ui";
import { puedeTenerCatalogoDeCalles } from "../domain";
import { ANCLA_DE_ALTA, conAnclaDeAlta } from "./anclaDeAlta";
import { BuscadorDeLaPestana } from "./BuscadorDeLaPestana";
import { type PropsDeContenido, rutaDe } from "./contenido";
import { FormularioDeAltaDeCalle } from "./FormularioDeAltaDeCalle";
import { ListaDeCalles } from "./ListaDeCalles";
import { BarraDeAcciones, PanelDeAccion } from "./PanelDeAccion";
import { PanelDeCalle } from "./PanelDeCalle";
import { paginaDeCalles } from "./paginaDeCalles";
import { puedeAbrir } from "./permisos";
import { centroDeCalles } from "./vistaDeCalles";

/**
 * Pestana Calles: el catalogo del asentamiento, el alta de una nueva calle
 * y el renombre de una existente.
 *
 * Cada fila abre el panel de la calle: ahora concentra ubicacion, renombre,
 * movimiento y baja sin inventar una segunda lista para elegirla.
 *
 * Lo que se abre va antes de la lista en el HTML: debajo de 1024px queda
 * arriba, a la vista, y no despues de cada calle del asentamiento. Desde
 * `lg` el panel de la calle se sienta en la segunda columna
 * (`PanelDeCalle`) y la lista ocupa la primera celda libre.
 */
export function TabDeCalles({
  raizId,
  lugar,
  calles,
  lugares,
  accion,
  permisos,
  calleId,
  busqueda,
  limite,
  usoDeCalle,
}: PropsDeContenido) {
  if (!puedeTenerCatalogoDeCalles(lugar.tipo)) {
    // `pestanasDePanel` ya filtra este tipo; el guard protege otras llamadas.
    return null;
  }

  const abierta =
    accion === "calle" ||
    accion === "renombrarCalle" ||
    accion === "ubicarCalle" ||
    accion === "reparentearCalle" ||
    accion === "bajaCalle";
  const puedeAgregar = puedeAbrir("calle", permisos);
  // El panel busca en el catalogo entero y no en la pagina: una calle
  // abierta desde la segunda pagina o fuera de la busqueda sigue abriendo.
  const calleSeleccionada = calleId
    ? calles.find((calle) => calle.id === calleId)
    : undefined;
  const pagina = paginaDeCalles(calles, { busqueda, limite });

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
            href={conAnclaDeAlta(
              rutaDe({
                raizId: raizId,
                nodoId: lugar.id,
                vista: "calles",
                accion: "calle",
              }),
            )}
            variante="primaria"
          >
            <Plus size={18} weight="bold" aria-hidden="true" />
            Agregar calle
          </EnlaceDeAccion>
        </BarraDeAcciones>
      ) : null}

      {puedeAgregar && accion === "calle" ? (
        <PanelDeAccion
          titulo={`Agregar una calle en ${lugar.nombre}`}
          id={ANCLA_DE_ALTA}
        >
          <FormularioDeAltaDeCalle
            raiz={raizId}
            nodo={lugar.id}
            volverA={rutaDe({
              raizId: raizId,
              nodoId: lugar.id,
              vista: "calles",
            })}
          />
        </PanelDeAccion>
      ) : null}

      {calles.length > 0 ? (
        <BuscadorDeLaPestana
          raizId={raizId}
          nodoId={lugar.id}
          vista="calles"
          etiqueta="Buscar calle"
          busqueda={busqueda}
        />
      ) : null}

      <div
        className={
          calleSeleccionada
            ? "grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-6"
            : "flex flex-col gap-4"
        }
      >
        {calleSeleccionada ? (
          <PanelDeCalle
            raizId={raizId}
            nodoId={lugar.id}
            calle={calleSeleccionada}
            lugares={lugares}
            accion={accion}
            permisos={permisos}
            centro={centroDeCalles(calles)}
            uso={usoDeCalle}
          />
        ) : null}
        <ListaDeCalles
          raizId={raizId}
          lugar={lugar}
          calles={pagina.filas}
          hayMas={pagina.hayMas}
          calleId={calleSeleccionada?.id}
          busqueda={busqueda}
          limite={limite}
        />
      </div>
    </div>
  );
}
