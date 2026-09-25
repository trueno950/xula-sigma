"use client";

import { SignOut } from "@phosphor-icons/react/ssr";
import { useState } from "react";
import { Aviso } from "./Aviso";
import { Boton } from "./Boton";
import { cerrarSesion } from "./cerrarSesion";

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
export function BotonDeCerrarSesion() {
  const [fallo, setFallo] = useState(false);
  const [enCurso, setEnCurso] = useState(false);

  const cerrar = async () => {
    setFallo(false);
    setEnCurso(true);

    const resultado = await cerrarSesion(fetch);

    if (resultado === "cerrada") {
      window.location.assign("/acceso");
      return;
    }

    setEnCurso(false);
    setFallo(true);
  };

  return (
    <div className="flex items-center gap-2">
      {fallo ? (
        <Aviso tono="error">
          No se pudo cerrar la sesión. Intente de nuevo.
        </Aviso>
      ) : null}
      <Boton
        type="button"
        variante="fantasma"
        onClick={cerrar}
        disabled={enCurso}
      >
        <SignOut size={20} aria-hidden="true" />
        Cerrar sesión
      </Boton>
    </div>
  );
}
