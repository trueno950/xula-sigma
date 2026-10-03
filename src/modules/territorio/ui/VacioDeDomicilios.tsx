import { Plus } from "@phosphor-icons/react/ssr";
import { EnlaceDeAccion, EstadoVacio } from "@/shared/ui";
import type { LugarId } from "../domain";
import { puedeTenerCatalogoDeCalles } from "../domain";
import { rutaDe } from "./contenido";
import type { NodoSeleccionado } from "./PanelDeNodo";

type Salida = { texto: string; href: string };

/**
 * Un domicilio necesita una calle: sin ninguna cargada el formulario se
 * abriria con su unico campo obligatorio vacio y sin nada que elegir. Dice
 * donde agregarla: en el lugar si lleva catalogo, y si no en el asentamiento.
 */
export function salidaSinCalles(
  raizId: LugarId,
  lugar: NodoSeleccionado,
): Salida {
  const poseeCatalogo = puedeTenerCatalogoDeCalles(lugar.tipo);

  return {
    texto: poseeCatalogo
      ? `Antes de cargar un domicilio hace falta al menos una calle en ${lugar.nombre}.`
      : "Antes de cargar un domicilio hace falta al menos una calle en el asentamiento que lo contiene.",
    href: rutaDe({
      raizId,
      nodoId: poseeCatalogo ? lugar.id : raizId,
      vista: "calles",
      accion: "calle",
    }),
  };
}

type Props = {
  raizId: LugarId;
  lugar: NodoSeleccionado;
  sinCalles: boolean;
  puedeActuar: boolean;
};

/**
 * El vacio inicial de la pestana. "Registrar domicilio" ya es la accion
 * primaria de la barra de la pestana: repetirla aqui serian dos primarias a
 * la vez. Solo sin calles la barra no aparece, y entonces la salida es la
 * calle.
 */
export function VacioDeDomicilios({
  raizId,
  lugar,
  sinCalles,
  puedeActuar,
}: Props) {
  const salida = salidaSinCalles(raizId, lugar);

  return (
    <EstadoVacio
      estado={{ clase: "vacio-inicial" }}
      mensajeInicial={`${lugar.nombre} no tiene domicilios todavía.${
        sinCalles ? ` ${salida.texto}` : ""
      }`}
      hrefSinFiltro={rutaDe({ raizId, nodoId: lugar.id, vista: "domicilios" })}
      {...(puedeActuar && sinCalles
        ? {
            accion: (
              <EnlaceDeAccion href={salida.href} variante="primaria">
                <Plus size={18} weight="bold" aria-hidden="true" />
                Agregar la primera calle
              </EnlaceDeAccion>
            ),
          }
        : {})}
    />
  );
}
