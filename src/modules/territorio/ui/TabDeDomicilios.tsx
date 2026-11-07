import { AvisoDePermiso, CLASES_DE_ENLACE, estadoDeLista } from "@/shared/ui";
import { puedeTenerCatalogoDeCalles } from "../domain";
import { BuscadorDeLaPestana } from "./BuscadorDeLaPestana";
import { CatalogoHeredado } from "./CatalogoHeredado";
import { CorreccionDeDomicilio } from "./CorreccionDeDomicilio";
import type { PropsDeContenido } from "./contenido";
import { PaginaOVacioPorFiltro } from "./ListaDeDomicilios";
import { PanelDeDomicilio } from "./PanelDeDomicilio";
import { puedeAbrir } from "./permisos";
import { salidaSinCalles, VacioDeDomicilios } from "./VacioDeDomicilios";
import { abreLaCorreccion } from "./vistaDeCorreccion";

/**
 * Pestana Domicilios: los domicilios colgados del lugar, en maestro-detalle
 * como Calles. Cada fila abre el panel de su domicilio al lado (`lg`) o
 * encima de la lista, sin estado de cliente. Llega una pagina (`?q=`, `?limite=`); el
 * domicilio abierto llega aparte, por id, y su panel no depende de que su
 * fila este en la pagina. Con `?accion=corregirDomicilio` la correccion
 * ocupa el lugar de la lista y del panel.
 */
export function TabDeDomicilios(props: PropsDeContenido) {
  const { accion, domicilio, permisos } = props;
  if (!abreLaCorreccion(accion, domicilio, permisos)) {
    return <ListaYPanel {...props} />;
  }

  return (
    <CorreccionDeDomicilio
      raizId={props.raizId}
      nodoId={props.lugar.id}
      domicilio={domicilio}
      calles={props.calles}
      lugares={props.lugares}
      nodos={props.nodos}
      borrador={props.borrador}
    />
  );
}

function ListaYPanel({
  raizId,
  lugar,
  nodos,
  calles,
  lugares,
  domicilio,
  accion,
  permisos,
  residentes,
  domicilios,
  mismaDireccion,
  busqueda,
  limite,
}: PropsDeContenido) {
  const puedeActuar = puedeAbrir("domicilio", permisos);
  const puedeAgregarCalle = puedeAbrir("calle", permisos);
  const filas = domicilios?.filas ?? [];
  const estado = estadoDeLista({ total: filas.length, filtro: busqueda });
  const sinCalles = calles.length === 0;
  const salida = salidaSinCalles(raizId, lugar);

  return (
    <div className="flex flex-col gap-4">
      {!puedeActuar ? (
        <AvisoDePermiso
          capacidad="registrar domicilios"
          requisito="un rol con permisos de escritura"
        />
      ) : null}

      {!puedeTenerCatalogoDeCalles(lugar.tipo) ? (
        <CatalogoHeredado raizId={raizId} lugares={lugares} />
      ) : null}

      {estado.clase !== "vacio-inicial" ? (
        <BuscadorDeLaPestana
          raizId={raizId}
          nodoId={lugar.id}
          vista="domicilios"
          etiqueta="Buscar domicilio"
          busqueda={busqueda}
        />
      ) : null}

      {estado.clase === "vacio-inicial" ? (
        <VacioDeDomicilios
          raizId={raizId}
          lugar={lugar}
          sinCalles={sinCalles}
          puedeActuar={puedeAgregarCalle}
        />
      ) : (
        <div
          className={
            domicilio
              ? "grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-6"
              : "flex flex-col gap-4"
          }
        >
          {domicilio ? (
            <PanelDeDomicilio
              raizId={raizId}
              nodoId={lugar.id}
              domicilio={domicilio}
              calles={calles}
              lugares={lugares}
              nodos={nodos}
              accion={accion}
              permisos={permisos}
              residentes={residentes === undefined ? [] : residentes}
              mismaDireccion={mismaDireccion ?? []}
            />
          ) : null}
          <PaginaOVacioPorFiltro
            raizId={raizId}
            lugar={lugar}
            domicilios={domicilios}
            domicilioId={domicilio?.id}
            busqueda={busqueda}
            limite={limite}
          />
        </div>
      )}

      {puedeAgregarCalle && sinCalles && filas.length > 0 ? (
        <p className="text-[15px] text-caliza-apagada">
          {salida.texto}{" "}
          <a href={salida.href} className={CLASES_DE_ENLACE}>
            Agregar la primera
          </a>
          .
        </p>
      ) : null}
    </div>
  );
}
