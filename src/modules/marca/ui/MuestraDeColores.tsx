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
 * La muestra en vivo: el boton, el item activo y el acento con el color
 * elegido, antes de guardar.
 *
 * Vive **dentro** de la seccion de colores y arriba de las dos paletas (S1):
 * era una columna fija que en el telefono quedaba debajo de los dos grupos, o
 * sea fuera de pantalla justo mientras se elegia (hallazgo M1).
 *
 * El texto de encima del acento es el que **mide** mas contraste contra el
 * color elegido (S3), no un token fijo: la muestra no puede prometer una
 * legibilidad que el color no tiene. El hallazgo M3 fue este chip con blanco
 * encima, a 3.01:1.
 *
 * Es decorativa y esta `aria-hidden`: no hay dato nuevo adentro —los campos
 * dicen que color esta elegido— y anunciarle a un lector de pantalla un boton
 * "Nueva persona" que no hace nada seria peor que no decir nada. El numero
 * medido si se lee: va en la vista previa de arriba, en texto.
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
  // `null` solo si el color no se puede medir; en ese caso la pastilla va
  // como relleno, sin texto encima.
  const textoDelAcento = textoSobre(colores.secundario);

  return (
    <div
      ref={contenedor}
      data-muestra="colores"
      aria-hidden="true"
      style={variables}
      className="flex flex-col gap-3 rounded-md border border-caliza-divisor bg-caliza-lienzo p-3"
    >
      <span className={CLASES_DE_ETIQUETA}>Con estos colores se ve así</span>
      <div className="flex flex-wrap items-center gap-2">
        <span className={clasesDeBoton("primaria")}>Nueva persona</span>
        <span className="inline-flex h-9 items-center gap-2 rounded-sm bg-marca-suave px-2 text-[15px] font-semibold text-caliza-tinta">
          Padrón
        </span>
        {textoDelAcento ? (
          <span
            className="inline-flex h-9 items-center rounded-sm bg-acento px-2.5 text-[13px] font-semibold"
            style={{ color: textoDelAcento }}
          >
            Énfasis
          </span>
        ) : (
          <span className="inline-block h-6 w-24 rounded-sm bg-acento" />
        )}
      </div>
    </div>
  );
}
