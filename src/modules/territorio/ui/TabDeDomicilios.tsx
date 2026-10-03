import {
  AvisoDePermiso,
  CeldaDeApoyo,
  CeldaPrincipal,
  CLASES_DE_TARJETA,
  type ColumnaDeTabla,
  FilaDeTabla,
  Tabla,
} from "@/shared/ui";
import { puedeTenerCatalogoDeCalles } from "../domain";
import {
  domiciliosDelSubarbolDe,
  type NodoDomicilio,
  type PropsDeContenido,
  rutaDe,
} from "./contenido";
import { PanelDeDomicilio } from "./PanelDeDomicilio";
import { puedeAbrir } from "./permisos";
import { direccionDe } from "./vistaDeDomicilios";

const COLUMNAS: readonly ColumnaDeTabla[] = [
  { clave: "domicilio", etiqueta: "Domicilio", ancho: "minmax(0,2fr)" },
  { clave: "lugar", etiqueta: "Lugar", ancho: "minmax(0,1fr)" },
];

const etiquetaDe = (domicilio: NodoDomicilio) =>
  direccionDe(domicilio.calle, domicilio.numero);

/**
 * Pestana Domicilios: los domicilios colgados del lugar.
 *
 * Sin enlace en la fila: un domicilio todavia no tiene pantalla propia.
 * Cuando la tenga -para ver quien vive ahi- la fila la gana sola.
 */
export function TabDeDomicilios({
  raizId,
  lugar,
  nodos,
  calles,
  lugares,
  domicilio,
  accion,
  permisos,
}: PropsDeContenido) {
  const puedeActuar = puedeAbrir("domicilio", permisos);
  const colgados = domiciliosDelSubarbolDe(nodos, lugar.id);
  const nombres = new Map<string, string>(
    nodos.flatMap((n) => (n.clase === "lugar" ? [[n.id, n.nombre]] : [])),
  );
  const nombreDe = (lugarId: string) => nombres.get(lugarId) ?? lugar.nombre;
  const sinCalles = calles.length === 0;
  const poseeCatalogo = puedeTenerCatalogoDeCalles(lugar.tipo);
  const lugarDeCallesId = poseeCatalogo ? lugar.id : raizId;
  const textoSinCalles = poseeCatalogo
    ? `Antes de cargar un domicilio hace falta al menos una calle en ${lugar.nombre}.`
    : "Antes de cargar un domicilio hace falta al menos una calle en el asentamiento que lo contiene.";
  return (
    <div className="flex flex-col gap-4">
      {!puedeActuar ? (
        <AvisoDePermiso
          capacidad="registrar domicilios"
          requisito="un rol con permisos de escritura"
        />
      ) : null}

      {colgados.length > 0 ? (
        <Tabla etiqueta={`Domicilios de ${lugar.nombre}`} columnas={COLUMNAS}>
          {colgados.map((fila) => (
            <FilaDeTabla
              key={fila.id}
              href={rutaDe({
                raizId: raizId,
                nodoId: fila.lugarId,
                vista: "domicilios",
                domicilioId: fila.id,
              })}
              etiquetaAccesible={`${etiquetaDe(fila)}, ${nombreDe(fila.lugarId)}`}
            >
              <CeldaPrincipal>{etiquetaDe(fila)}</CeldaPrincipal>
              <CeldaDeApoyo>{nombreDe(fila.lugarId)}</CeldaDeApoyo>
            </FilaDeTabla>
          ))}
        </Tabla>
      ) : (
        <p className={`${CLASES_DE_TARJETA} text-[15px] text-caliza-apagada`}>
          {lugar.nombre} no tiene domicilios todavía.
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
          {textoSinCalles}{" "}
          <a
            href={rutaDe({
              raizId: raizId,
              nodoId: lugarDeCallesId,
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
        />
      ) : null}
    </div>
  );
}
