import { Plus } from "@phosphor-icons/react/ssr";
import {
  AvisoDePermiso,
  CeldaPrincipal,
  CLASES_DE_TARJETA,
  type ColumnaDeTabla,
  EnlaceDeAccion,
  FilaDeTabla,
  Tabla,
} from "@/shared/ui";
import { tipoDeLugarEnFrase, tiposContenidosPor } from "../domain";
import { hijosDirectosDe, type PropsDeContenido, rutaDe } from "./contenido";
import { Cuentas, PastillaDeTipo } from "./FilaDeLugar";
import { FormularioDeAltaDeLugar } from "./FormularioDeAltaDeLugar";
import { BarraDeAcciones, PanelDeAccion } from "./PanelDeAccion";
import { puedeAbrir } from "./permisos";

const COLUMNAS: readonly ColumnaDeTabla[] = [
  { clave: "lugar", etiqueta: "Lugar", ancho: "minmax(0,2fr)" },
  { clave: "tipo", etiqueta: "Tipo", ancho: "minmax(0,1fr)" },
  { clave: "contenido", etiqueta: "Contenido", ancho: "minmax(0,2fr)" },
];

/** Pestana Lugares: los hijos directos para entrar, y el alta de uno nuevo. */
export function TabDeLugares({
  raizId,
  lugar,
  nodos,
  accion,
  permisos,
  conteos,
}: PropsDeContenido) {
  const puedeActuar = puedeAbrir("lugar", permisos);
  const hijos = hijosDirectosDe(nodos, lugar.id);
  const abierta = accion === "lugar";
  // Una colonia es el ultimo rango: no hay tipo que pueda ir adentro, asi
  // que ofrecer "Agregar lugar" abriria un formulario sin una sola opcion.
  const admiteLugares = tiposContenidosPor(lugar.tipo).length > 0;

  return (
    <div className="flex flex-col gap-4">
      {!puedeActuar && admiteLugares ? (
        <AvisoDePermiso
          capacidad="agregar lugares al territorio"
          requisito="un rol con permisos de escritura"
        />
      ) : null}

      {puedeActuar && admiteLugares && !abierta ? (
        <BarraDeAcciones>
          <EnlaceDeAccion
            href={rutaDe({
              raizId: raizId,
              nodoId: lugar.id,
              vista: "lugares",
              accion: "lugar",
            })}
            variante="primaria"
          >
            <Plus size={18} weight="bold" aria-hidden="true" />
            Agregar lugar
          </EnlaceDeAccion>
        </BarraDeAcciones>
      ) : null}

      {hijos.length > 0 ? (
        <Tabla
          etiqueta={`Lugares dentro de ${lugar.nombre}`}
          columnas={COLUMNAS}
        >
          {hijos.map((hijo) => (
            <FilaDeTabla
              key={hijo.id}
              href={`/territorio?raiz=${raizId}&nodo=${hijo.id}`}
              etiquetaAccesible={`${hijo.nombre}, ${tipoDeLugarEnFrase(hijo.tipo)}`}
            >
              <CeldaPrincipal>{hijo.nombre}</CeldaPrincipal>
              <span className="flex">
                <PastillaDeTipo tipo={hijo.tipo} />
              </span>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Cuentas
                  cuenta={conteos?.find((cuenta) => cuenta.lugarId === hijo.id)}
                />
              </span>
            </FilaDeTabla>
          ))}
        </Tabla>
      ) : (
        <p className={`${CLASES_DE_TARJETA} text-[15px] text-caliza-apagada`}>
          {admiteLugares
            ? `${lugar.nombre} no tiene lugares adentro todavía.`
            : `Una ${tipoDeLugarEnFrase(lugar.tipo)} es el último nivel: no lleva lugares adentro, solo domicilios.`}
        </p>
      )}

      {puedeActuar && abierta ? (
        <PanelDeAccion titulo={`Agregar un lugar dentro de ${lugar.nombre}`}>
          <FormularioDeAltaDeLugar
            raiz={raizId}
            nodo={lugar.id}
            padreId={lugar.id}
            tipoDelPadre={lugar.tipo}
            volverA={rutaDe({
              raizId: raizId,
              nodoId: lugar.id,
              vista: "lugares",
            })}
          />
        </PanelDeAccion>
      ) : null}
    </div>
  );
}
