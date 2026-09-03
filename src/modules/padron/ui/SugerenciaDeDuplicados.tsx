"use client";

import { useRef, useState } from "react";
import { CLASES_DE_ETIQUETA } from "@/shared/ui";
import { crearAlTeclear, crearPropsDeCampo } from "./interaccionDeSugerencias";
import { ListaDeSugerencias } from "./ListaDeSugerencias";
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
  const alTeclear = crearAlTeclear({
    abierta,
    activa,
    sugerencias,
    setActiva,
    setCerrada,
  });
  const propsDeCampo = crearPropsDeCampo({
    abierta,
    activa,
    alTeclear,
    contenedor,
    setCerrada,
  });

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
