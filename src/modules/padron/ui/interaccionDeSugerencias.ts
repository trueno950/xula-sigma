import type {
  Dispatch,
  FocusEvent,
  KeyboardEvent,
  RefObject,
  SetStateAction,
} from "react";
import { clasesDeCampo } from "@/shared/ui";
import type { SugerenciaDeDuplicado } from "./actions/sugerirDuplicados.action";
import { ID_DE_LISTA, idDeOpcion } from "./ListaDeSugerencias";
import { indicePrevio, siguienteIndice } from "./navegacionDeSugerencias";

/**
 * Las flechas recorren la lista sin sacar el cursor del campo y Enter abre
 * la ficha marcada en otra pestana — la unica forma de descartar un
 * homonimo es mirar su registro, y hacerlo en la misma pestana perderia lo
 * escrito. Enter sin nada marcado no se toca: envia el formulario, como en
 * cualquier campo.
 *
 * Fabrica y no un handler inline: recibe el estado por parametro en vez de
 * cerrar sobre el del componente, que es lo que la deja aparte del
 * archivo de `SugerenciaDeDuplicados.tsx`.
 */
export function crearAlTeclear({
  abierta,
  activa,
  sugerencias,
  setActiva,
  setCerrada,
}: {
  abierta: boolean;
  activa: number;
  sugerencias: readonly SugerenciaDeDuplicado[];
  setActiva: Dispatch<SetStateAction<number>>;
  setCerrada: (cerrada: boolean) => void;
}) {
  return (evento: KeyboardEvent<HTMLInputElement>) => {
    if (!abierta) return;

    if (evento.key === "Escape") {
      setCerrada(true);
      setActiva(-1);
      return;
    }

    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setActiva((previa) => siguienteIndice(previa, sugerencias.length));
      return;
    }

    if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setActiva((previa) => indicePrevio(previa, sugerencias.length));
      return;
    }

    if (evento.key === "Enter" && activa >= 0) {
      const persona = sugerencias[activa];
      if (!persona) return;

      evento.preventDefault();
      window.open(`/padron/${persona.id}`, "_blank", "noopener");
    }
  };
}

/**
 * Los props que comparten los dos campos: combobox con las mismas
 * cabeceras ARIA, el mismo teclado y el mismo cierre por foco.
 *
 * `onBlur` cierra cuando el foco sale del grupo: la lista flota sobre
 * "Segundo apellido", y dejarla abierta mientras la operadora ya esta
 * escribiendo ahi le tapa el campo en el que esta. `relatedTarget` es a
 * donde va el foco; si sigue adentro —el enlace de una fila, el otro
 * campo— no se cierra nada.
 */
export function crearPropsDeCampo({
  abierta,
  activa,
  alTeclear,
  contenedor,
  setCerrada,
}: {
  abierta: boolean;
  activa: number;
  alTeclear: (evento: KeyboardEvent<HTMLInputElement>) => void;
  contenedor: RefObject<HTMLDivElement | null>;
  setCerrada: (cerrada: boolean) => void;
}) {
  return {
    type: "text" as const,
    required: true,
    autoComplete: "off",
    role: "combobox" as const,
    "aria-expanded": abierta,
    "aria-controls": ID_DE_LISTA,
    "aria-autocomplete": "list" as const,
    ...(activa >= 0 ? { "aria-activedescendant": idDeOpcion(activa) } : {}),
    className: clasesDeCampo(),
    onKeyDown: alTeclear,
    onFocus: () => setCerrada(false),
    onBlur: (evento: FocusEvent<HTMLInputElement>) => {
      if (!contenedor.current?.contains(evento.relatedTarget)) {
        setCerrada(true);
      }
    },
  };
}
