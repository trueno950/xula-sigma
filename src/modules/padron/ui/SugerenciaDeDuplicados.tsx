"use client";

import { type FocusEvent, type KeyboardEvent, useRef, useState } from "react";
import { CLASES_DE_ETIQUETA, clasesDeCampo } from "@/shared/ui";
import {
  ID_DE_LISTA,
  idDeOpcion,
  ListaDeSugerencias,
} from "./ListaDeSugerencias";
import { indicePrevio, siguienteIndice } from "./navegacionDeSugerencias";
import { useSugerenciasDeDuplicados } from "./useSugerenciasDeDuplicados";

/**
 * Unica hoja `"use client"` de la rebanada 4 (tasks.md 4.25): mostrar
 * sugerencias mientras se escribe necesita estado de cliente, y no existe
 * forma de pedirselo a un Server Component.
 *
 * Reemplaza los campos `nombres`/`primerApellido` de
 * `FormularioDeAltaDePersona` en vez de vivir al lado: los dos siguen
 * llevando su `name` nativo, asi que el `<form action>` que los envuelve
 * los sigue leyendo igual al enviar.
 *
 * **Es el componente de firma de `DESIGN.md`, y lo que lo define es lo que
 * NO hace.** No roba el foco: la opcion marcada se anuncia con
 * `aria-activedescendant` y el cursor nunca sale del campo. No frena el
 * envio: no hay estado "confirme que no es duplicado", y la operadora
 * puede escribir hasta el final y guardar sin mirar la lista. Una
 * validacion que bloquea manda el tramite al papel, y el papel no tiene
 * RLS ni bitacora.
 *
 * La marca es la senal de aviso **mas la palabra "posible duplicado"**,
 * nunca solo el color: la marca del municipio puede ser de ese mismo tono.
 */
export function SugerenciaDeDuplicados() {
  const [nombres, setNombres] = useState("");
  const [primerApellido, setPrimerApellido] = useState("");
  /** -1 es "ninguna marcada", que es el estado en el que se escribe. */
  const [activa, setActiva] = useState(-1);
  /** La cierra Escape. Vuelve a abrirse en cuanto cambia lo escrito. */
  const [cerrada, setCerrada] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const { sugerencias, consultar: consultarDuplicados } =
    useSugerenciasDeDuplicados();

  const consultar = (nombresNuevo: string, apellidoNuevo: string) => {
    setCerrada(false);
    setActiva(-1);
    consultarDuplicados(nombresNuevo, apellidoNuevo);
  };

  const abierta = sugerencias.length > 0 && !cerrada;

  /**
   * Las flechas recorren la lista sin sacar el cursor del campo y Enter
   * abre la ficha marcada en otra pestana — la unica forma de descartar un
   * homonimo es mirar su registro, y hacerlo en la misma pestana perderia
   * lo escrito. Enter sin nada marcado no se toca: envia el formulario,
   * como en cualquier campo.
   */
  const alTeclear = (evento: KeyboardEvent<HTMLInputElement>) => {
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

  const propsDeCampo = {
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
    /**
     * La lista se cierra cuando el foco sale del grupo: flota sobre
     * "Segundo apellido", y dejarla abierta mientras la operadora ya esta
     * escribiendo ahi le tapa el campo en el que esta. `relatedTarget` es a
     * donde va el foco: si sigue adentro —el enlace de una fila, el otro
     * campo— no se cierra nada.
     */
    onBlur: (evento: FocusEvent<HTMLInputElement>) => {
      if (!contenedor.current?.contains(evento.relatedTarget)) setCerrada(true);
    },
  };

  return (
    <div ref={contenedor} className="relative flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className={CLASES_DE_ETIQUETA}>Nombres</span>
        <input
          {...propsDeCampo}
          name="nombres"
          value={nombres}
          onChange={(evento) => {
            setNombres(evento.target.value);
            consultar(evento.target.value, primerApellido);
          }}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className={CLASES_DE_ETIQUETA}>Primer apellido</span>
        <input
          {...propsDeCampo}
          name="primerApellido"
          value={primerApellido}
          onChange={(evento) => {
            setPrimerApellido(evento.target.value);
            consultar(nombres, evento.target.value);
          }}
        />
      </label>

      {abierta ? (
        <ListaDeSugerencias sugerencias={sugerencias} activa={activa} />
      ) : null}
    </div>
  );
}
