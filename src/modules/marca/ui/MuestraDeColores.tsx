"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { TEXTO_CLARO, textoSobre } from "@/shared/marca";
import { CLASES_DE_ETIQUETA, clasesDeBoton } from "@/shared/ui/estilos";
import { colorElegido } from "./seleccionDeColor";

type Props = {
  primario: string;
  secundario: string;
};

/**
 * La muestra en vivo de S4: un boton, un encabezado y el acento de ejemplo
 * que toman el color elegido antes de guardar.
 *
 * Es decorativa y esta `aria-hidden`: no hay dato nuevo adentro —los
 * campos dicen que color esta elegido— y anunciarle a un lector de pantalla
 * un boton "Guardar" que no guarda seria peor que no decir nada.
 *
 * Es la unica hoja `"use client"` de la pantalla y **no intercepta el
 * envio**: no toca la accion del formulario ni sus campos, y no dibuja
 * ningun control. Escucha los eventos `input` y `change` del `<form>` que la
 * contiene y repinta solo lo de adentro, leyendo `new FormData(formulario)`
 * — exactamente lo que el POST va a mandar, en vez de una segunda copia del
 * estado que podria divergir.
 */
export function MuestraDeColores({ primario, secundario }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [colores, setColores] = useState({ primario, secundario });

  useEffect(() => {
    const formulario = contenedor.current?.closest("form");

    if (!formulario) return;

    const repintar = () => {
      const datos = new FormData(formulario);

      setColores({
        primario: colorElegido(datos, "primario") || primario,
        secundario: colorElegido(datos, "secundario") || secundario,
      });
    };

    formulario.addEventListener("input", repintar);
    formulario.addEventListener("change", repintar);

    return () => {
      formulario.removeEventListener("input", repintar);
      formulario.removeEventListener("change", repintar);
    };
  }, [primario, secundario]);

  const variables = {
    "--primary": colores.primario,
    "--accent": colores.secundario,
    "--primary-foreground": textoSobre(colores.primario) ?? TEXTO_CLARO,
  } as CSSProperties;

  return (
    <div
      ref={contenedor}
      data-muestra="colores"
      aria-hidden="true"
      style={variables}
      className="flex flex-col gap-3 rounded-md border border-caliza-divisor bg-caliza-superficie p-3"
    >
      <span className={CLASES_DE_ETIQUETA}>Muestra</span>
      <div className="flex flex-wrap items-center gap-2">
        <span aria-hidden className={clasesDeBoton("primaria")}>
          Guardar
        </span>
        <span
          aria-hidden
          className="inline-flex h-11 items-center rounded-md bg-marca px-3 text-[13px] font-semibold text-marca-texto"
        >
          Encabezado
        </span>
        <span
          aria-hidden
          className="inline-flex h-11 items-center rounded-md bg-acento px-3 text-[13px] font-semibold text-caliza-lienzo"
        >
          Acento
        </span>
      </div>
    </div>
  );
}
