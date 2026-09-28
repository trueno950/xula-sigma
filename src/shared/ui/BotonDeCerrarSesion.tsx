"use client";

import { SignOut } from "@phosphor-icons/react/ssr";
import { useState, useSyncExternalStore } from "react";
import { datosSegurosDeError } from "../lib/registroDeError";
import { Aviso } from "./Aviso";
import { Boton } from "./Boton";
import { cerrarYVolver } from "./cerrarSesion";

/**
 * Cerrar la sesion desde cualquier pantalla con cabecera.
 *
 * Es `"use client"` porque el cierre es una llamada a `/api/auth/sign-out`
 * seguida de una navegacion, y ambas viven en el navegador. Es la hoja: solo
 * este boton. No usa una Server Action por lo mismo que el formulario de
 * acceso: la ruta de Better Auth es la unica puerta de autenticacion.
 *
 * Recarga entera y no `router.push`: la pagina siguiente tiene que leer la
 * cookie ya vencida, y una navegacion de cliente puede servir una copia
 * anterior del panel. Va a `/acceso` del mismo host: el municipio no cambia.
 */
const suscribirseSinCambios = () => () => {};
const useHidratado = () =>
  useSyncExternalStore(
    suscribirseSinCambios,
    () => true,
    () => false,
  );

export function BotonDeCerrarSesion() {
  const [fallo, setFallo] = useState(false);
  const [enCurso, setEnCurso] = useState(false);
  const hidratado = useHidratado();

  const cerrar = () => {
    void cerrarYVolver({
      enviar: fetch,
      irA: (ruta) => window.location.assign(ruta),
      marcar: (estado) => {
        setEnCurso(estado.enCurso);
        setFallo(estado.fallo);
      },
    }).catch((error: unknown) => {
      console.error(
        "[cerrarSesion] fallo inesperado",
        datosSegurosDeError(error),
      );
    });
  };

  return (
    <div className="flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
      {fallo ? (
        <Aviso tono="error">
          No se pudo cerrar la sesión. Intente de nuevo.
        </Aviso>
      ) : null}
      <Boton
        type="button"
        variante="fantasma"
        onClick={cerrar}
        disabled={!hidratado || enCurso}
      >
        <SignOut size={20} aria-hidden="true" />
        Cerrar sesión
      </Boton>
    </div>
  );
}
