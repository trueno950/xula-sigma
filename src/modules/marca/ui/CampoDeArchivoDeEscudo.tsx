"use client";

import { useState } from "react";
import { MensajeDeError } from "@/shared/ui/Campo";
import { ANILLO_DE_FOCO, descripcionDeCampo } from "@/shared/ui/estilos";
import {
  type ClaveDeErrorDeEscudo,
  MENSAJES_DE_ERROR_DE_ESCUDO,
} from "./mensajesDeMarca";
import { REQUISITOS_DE_ESCUDO } from "./requisitosDeEscudo";
import { archivoDemasiadoGrande } from "./tamanoDeArchivo";

const CLASES_DE_ARCHIVO = (conError: boolean) =>
  "w-full rounded-md border bg-caliza-lienzo px-3 py-2 text-[15px] " +
  "text-caliza-tinta transition-[border-color] duration-150 ease-salida " +
  "file:mr-3 file:rounded-sm file:border-0 file:bg-caliza-relleno " +
  "file:px-3 file:py-1.5 file:text-[13px] file:font-medium " +
  `file:text-caliza-tinta ${conError ? "border-senial-error" : "border-caliza-borde"} ` +
  ANILLO_DE_FOCO;

type Props = {
  idDeArchivo: string;
  idDeAyuda: string;
  /** El rechazo con el que volvio la accion, si volvio con uno (S9). */
  error: ClaveDeErrorDeEscudo | undefined;
};

/**
 * El campo de archivo, con su error pegado (S9).
 *
 * Es la unica hoja cliente del formulario, y **no envuelve la Server
 * Action**: el `<form action>` sigue siendo el del servidor y el envio sin
 * JavaScript es el POST nativo de siempre (S6). Lo que agrega es el unico
 * rechazo que el servidor no puede dar: un archivo que el transporte de Next
 * ni siquiera admite —corta en 2 MB— nunca llega a la accion, y antes eso
 * terminaba en una pagina de error del framework. Con esto el archivo se
 * descarta en el navegador, con la oracion del catalogo, y el campo queda
 * vacio para que no se reenvie (S9).
 */
export function CampoDeArchivoDeEscudo({
  idDeArchivo,
  idDeAyuda,
  error,
}: Props) {
  const [mensajeLocal, setMensajeLocal] = useState<string | undefined>();
  const mensaje =
    mensajeLocal ?? (error ? MENSAJES_DE_ERROR_DE_ESCUDO[error] : undefined);
  const descripcion = descripcionDeCampo(
    { ayuda: REQUISITOS_DE_ESCUDO, error: mensaje },
    { idDeAyuda, idDeError: `${idDeArchivo}-error` },
  );

  const alElegir = (evento: React.ChangeEvent<HTMLInputElement>) => {
    const rechazo = archivoDemasiadoGrande(evento.currentTarget.files?.[0]);

    if (rechazo) evento.currentTarget.value = "";

    setMensajeLocal(rechazo);
  };

  return (
    <>
      <input
        id={idDeArchivo}
        name="escudo"
        type="file"
        accept="image/png"
        onChange={alElegir}
        aria-invalid={mensaje ? true : undefined}
        aria-describedby={descripcion}
        className={CLASES_DE_ARCHIVO(Boolean(mensaje))}
      />
      {mensaje ? (
        <MensajeDeError id={`${idDeArchivo}-error`} texto={mensaje} />
      ) : null}
    </>
  );
}
