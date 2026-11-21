"use client";

import { useEffect, useState } from "react";
import { Aviso } from "@/shared/ui";
import {
  descargarLosDatos,
  guardarArchivo,
  ID_DEL_ENLACE_DE_DESCARGA,
} from "./descargar";
import {
  type CodigoDeDescarga,
  formatearTamano,
  MENSAJES_DE_DESCARGA,
} from "./mensajesDeDescarga";

type Estado =
  | { tipo: "quieto" }
  | { tipo: "preparando" }
  | { tipo: "descargado"; nombre: string; bytes: number }
  | { tipo: "error"; codigo: CodigoDeDescarga };

/**
 * El estado de la descarga (S12, S13) cuando hay JavaScript.
 *
 * **No dibuja el boton.** El enlace es el del HTML, nativo, y esta isla solo
 * escucha su clic: si el JavaScript no llega, el navegador descarga igual y el
 * borde manda el fallo de vuelta al panel con un codigo; si llega, la pantalla
 * dice «armando» y despues el nombre y el tamano del archivo, que es lo que
 * sin JavaScript no se puede saber.
 *
 * El codigo del `?error=` entra como estado inicial y no como texto a pintar:
 * con JavaScript y sin JavaScript, lo que se lee es el mensaje de
 * `MENSAJES_DE_DESCARGA`.
 */
export function EstadoDeLaDescarga({
  nombre,
  codigoInicial,
}: {
  nombre: string;
  codigoInicial: CodigoDeDescarga | null;
}) {
  const [estado, setEstado] = useState<Estado>(
    codigoInicial
      ? { tipo: "error", codigo: codigoInicial }
      : { tipo: "quieto" },
  );

  useEffect(() => {
    const enlace = document.getElementById(ID_DEL_ENLACE_DE_DESCARGA);
    if (!enlace) return;

    const alPedir = async (evento: Event) => {
      evento.preventDefault();
      setEstado({ tipo: "preparando" });

      const resultado = await descargarLosDatos(nombre);

      if (resultado.tipo === "error") {
        setEstado({ tipo: "error", codigo: resultado.codigo });
        return;
      }

      guardarArchivo(resultado.blob, resultado.nombre);
      setEstado({
        tipo: "descargado",
        nombre: resultado.nombre,
        bytes: resultado.bytes,
      });
      // El `?error=` de un intento anterior ya no describe nada.
      window.history.replaceState(null, "", window.location.pathname);
    };

    enlace.addEventListener("click", alPedir);
    return () => enlace.removeEventListener("click", alPedir);
  }, [nombre]);

  return <MensajeDelEstado estado={estado} nombre={nombre} />;
}

function MensajeDelEstado({
  estado,
  nombre,
}: {
  estado: Estado;
  nombre: string;
}) {
  if (estado.tipo === "preparando") {
    return (
      <p role="status" className="text-[15px] text-caliza-apagada">
        {`Armando ${nombre}… Puede seguir trabajando en otra pestaña, pero no cierre esta.`}
      </p>
    );
  }

  if (estado.tipo === "descargado") {
    return (
      <Aviso tono="exito">
        {`Se descargó ${estado.nombre} (${formatearTamano(estado.bytes)}). Quedó anotada en la bitácora con quién la pidió y la hora.`}
      </Aviso>
    );
  }

  if (estado.tipo === "error") {
    return <Aviso tono="error">{MENSAJES_DE_DESCARGA[estado.codigo]}</Aviso>;
  }

  return null;
}
