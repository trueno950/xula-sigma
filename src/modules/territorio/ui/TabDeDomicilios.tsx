import { Plus } from "@phosphor-icons/react/ssr";
import {
  CeldaDeDato,
  CeldaPrincipal,
  type ColumnaDeTabla,
  EnlaceDeAccion,
  FilaDeTabla,
  Tabla,
} from "@/shared/ui";
import type { DomicilioParaListado } from "../application/puertosDeDomicilios";
import {
  domiciliosDirectosDe,
  type PropsDeContenido,
  rutaDe,
} from "./contenido";
import { FormularioDeDomicilio } from "./FormularioDeDomicilio";
import { BarraDeAcciones, PanelDeAccion } from "./PanelDeAccion";

const COLUMNAS: readonly ColumnaDeTabla[] = [
  { clave: "domicilio", etiqueta: "Domicilio", ancho: "minmax(0,2fr)" },
  { clave: "lugar", etiqueta: "Lugar", ancho: "minmax(0,1fr)" },
];

/** "Calle 20 #5" o "Calle 20 S/N": el numero va en tipografia Dato. */
const direccionDe = (domicilio: DomicilioParaListado) =>
  `${domicilio.calle} ${domicilio.numero ?? "S/N"}`;

/**
 * Pestana Domicilios: los domicilios colgados del lugar, y el alta de uno.
 *
 * Sin enlace en la fila: un domicilio todavia no tiene pantalla propia.
 * Cuando la tenga -para ver quien vive ahi- la fila la gana sola.
 */
export function TabDeDomicilios({
  raizId,
  lugar,
  nodos,
  calles,
  domicilios,
  accion,
  puedeActuar,
}: PropsDeContenido) {
  const colgados = domiciliosDirectosDe(nodos, domicilios, lugar.id);
  const abierta = accion === "domicilio";
  const sinCalles = calles.length === 0;

  return (
    <div className="flex flex-col gap-4">
      {puedeActuar && !abierta && !sinCalles ? (
        <BarraDeAcciones>
          <EnlaceDeAccion
            href={rutaDe({
              raizId: raizId,
              nodoId: lugar.id,
              vista: "domicilios",
              accion: "domicilio",
            })}
            variante="primaria"
          >
            <Plus size={18} weight="bold" aria-hidden="true" />
            Agregar domicilio
          </EnlaceDeAccion>
        </BarraDeAcciones>
      ) : null}

      {colgados.length > 0 ? (
        <Tabla etiqueta={`Domicilios de ${lugar.nombre}`} columnas={COLUMNAS}>
          {colgados.map((domicilio) => (
            <FilaDeTabla key={domicilio.id}>
              <CeldaPrincipal>{direccionDe(domicilio)}</CeldaPrincipal>
              <CeldaDeDato>{domicilio.lugar}</CeldaDeDato>
            </FilaDeTabla>
          ))}
        </Tabla>
      ) : (
        <p className="py-6 text-[15px] text-caliza-apagada">
          {lugar.nombre} no tiene domicilios todavia.
        </p>
      )}

      {/*
        Un domicilio necesita una calle: sin ninguna cargada, el formulario
        se abriria con su unico campo obligatorio vacio y sin nada que
        elegir. Decirlo aca, con la salida a la pestana que lo resuelve,
        es lo unico que evita ese callejon.
      */}
      {puedeActuar && sinCalles ? (
        <p className="text-[15px] text-caliza-apagada">
          Antes de cargar un domicilio hace falta al menos una calle en{" "}
          {lugar.nombre}.{" "}
          <a
            href={rutaDe({
              raizId: raizId,
              nodoId: lugar.id,
              vista: "calles",
              accion: "calle",
            })}
            className="text-marca underline underline-offset-2"
          >
            Agregar la primera
          </a>
          .
        </p>
      ) : null}

      {puedeActuar && abierta ? (
        <PanelDeAccion
          titulo={`Agregar un domicilio en ${lugar.nombre}`}
          volverA={rutaDe({
            raizId: raizId,
            nodoId: lugar.id,
            vista: "domicilios",
          })}
        >
          <FormularioDeDomicilio
            raiz={raizId}
            nodo={lugar.id}
            calles={calles}
          />
        </PanelDeAccion>
      ) : null}
    </div>
  );
}
