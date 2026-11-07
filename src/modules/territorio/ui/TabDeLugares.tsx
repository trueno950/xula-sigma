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
import { tipoDeLugarEnFrase } from "../domain";
import { ANCLA_DE_ALTA, conAnclaDeAlta } from "./anclaDeAlta";
import { hijosDirectosDe, type PropsDeContenido, rutaDe } from "./contenido";
import { Cuentas, PastillaDeTipo } from "./FilaDeLugar";
import { FormularioDeAltaDeLugar } from "./FormularioDeAltaDeLugar";
import { BarraDeAcciones, PanelDeAccion } from "./PanelDeAccion";
import { puedeAbrir } from "./permisos";
import { tiposParaElAlta, tituloDelAlta, verboDelAlta } from "./tiposDelAlta";

const COLUMNAS: readonly ColumnaDeTabla[] = [
  { clave: "lugar", etiqueta: "Lugar", ancho: "minmax(0,2fr)" },
  { clave: "tipo", etiqueta: "Tipo", ancho: "minmax(0,1fr)" },
  { clave: "contenido", etiqueta: "Contenido", ancho: "minmax(0,2fr)" },
];

const SIN_TIPO = COLUMNAS.filter((columna) => columna.clave !== "tipo");

/** Por nombre, como lo lee una persona: "Ébano" va entre "Centro" y "Zona". */
const porNombre = (a: { nombre: string }, b: { nombre: string }) =>
  a.nombre.localeCompare(b.nombre, "es");

/**
 * Pestana Lugares: los hijos directos para entrar, y el alta de uno nuevo,
 * arriba de la lista para que se vea al abrirla.
 */
export function TabDeLugares({
  raizId,
  lugar,
  nodos,
  accion,
  permisos,
  conteos,
}: PropsDeContenido) {
  const puedeActuar = puedeAbrir("lugar", permisos);
  const hijos = [...hijosDirectosDe(nodos, lugar.id)].sort(porNombre);
  const abierta = accion === "lugar";
  const tipos = tiposParaElAlta({
    tipoDelPadre: lugar.tipo,
    hayCabecera: false,
  });
  // Una colonia es el ultimo rango: no hay tipo que pueda ir adentro, asi
  // que ofrecer "Agregar lugar" abriria un formulario sin una sola opcion.
  const admiteLugares = tipos.length > 0;
  // Una columna que repite la misma palabra en cada fila no distingue nada.
  const mezclaTipos = new Set(hijos.map((hijo) => hijo.tipo)).size > 1;

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
            href={conAnclaDeAlta(
              rutaDe({
                raizId: raizId,
                nodoId: lugar.id,
                vista: "lugares",
                accion: "lugar",
              }),
            )}
            variante="primaria"
          >
            <Plus size={18} weight="bold" aria-hidden="true" />
            {verboDelAlta(tipos) ?? "Agregar lugar"}
          </EnlaceDeAccion>
        </BarraDeAcciones>
      ) : null}

      {puedeActuar && abierta ? (
        <PanelDeAccion
          titulo={tituloDelAlta({ tipos, dentroDe: lugar.nombre })}
          id={ANCLA_DE_ALTA}
        >
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

      {hijos.length > 0 ? (
        <Tabla
          etiqueta={`Lugares dentro de ${lugar.nombre}`}
          columnas={mezclaTipos ? COLUMNAS : SIN_TIPO}
        >
          {hijos.map((hijo) => (
            <FilaDeTabla
              key={hijo.id}
              href={`/territorio?raiz=${raizId}&nodo=${hijo.id}`}
              etiquetaAccesible={`${hijo.nombre}, ${tipoDeLugarEnFrase(hijo.tipo)}`}
            >
              <CeldaPrincipal>{hijo.nombre}</CeldaPrincipal>
              {mezclaTipos ? (
                <span className="flex">
                  <PastillaDeTipo tipo={hijo.tipo} />
                </span>
              ) : null}
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Cuentas
                  cuenta={conteos?.find((cuenta) => cuenta.lugarId === hijo.id)}
                />
              </span>
            </FilaDeTabla>
          ))}
        </Tabla>
      ) : admiteLugares ? (
        <p className={`${CLASES_DE_TARJETA} text-[15px] text-caliza-apagada`}>
          {lugar.nombre} no tiene lugares adentro todavía.
        </p>
      ) : null}
    </div>
  );
}
