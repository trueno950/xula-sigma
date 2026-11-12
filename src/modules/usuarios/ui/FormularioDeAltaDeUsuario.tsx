import {
  Boton,
  Campo,
  CampoDeLista,
  CLASES_DE_FORMULARIO,
  EnlaceDeAccion,
  GrupoDeCampos,
} from "@/shared/ui";
import { Aviso } from "@/shared/ui/Aviso";
import { BarraDeAcciones } from "@/shared/ui/BarraDeAcciones";
import { altaDeUsuarioAction } from "./actions/altaDeUsuarioAction";
import { opcionesDeRol } from "./opcionesDeRol";

/**
 * Server Component, `<form action={...}>` nativo sin `"use client"`
 * (`AGENTS.md`, seccion Server Actions). El error vuelve por `?error=` y se
 * pinta arriba; el exito no vuelve aca sino al listado, porque es ahi donde
 * aparece la contrasenia temporal (S4).
 */
export function FormularioDeAltaDeUsuario({ error }: { error?: string }) {
  return (
    <form action={altaDeUsuarioAction} className={CLASES_DE_FORMULARIO}>
      {error ? <Aviso tono="error">{error}</Aviso> : null}

      <GrupoDeCampos titulo="Quién entra">
        <Campo
          id="usuario-nombre"
          name="nombre"
          etiqueta="Nombre completo"
          ayuda="Como va a aparecer en la bitácora del municipio."
          required
          minLength={3}
          maxLength={120}
        />
        <Campo
          id="usuario-correo"
          name="email"
          type="email"
          etiqueta="Correo"
          ayuda="Con este correo inicia sesión."
          required
          maxLength={160}
        />
      </GrupoDeCampos>

      <GrupoDeCampos titulo="Qué puede hacer">
        <CampoDeLista
          id="usuario-rol"
          name="rol"
          etiqueta="Rol"
          marcador="Elija un rol"
          opciones={opcionesDeRol}
          ayuda="Operador captura y modifica; consulta solo mira. El administrador del municipio no se crea desde acá."
        />
      </GrupoDeCampos>

      {/*
        Se dice antes, no despues: la contrasenia se muestra una sola vez y
        quien captura tiene que estar listo para entregarla (S4).
      */}
      <p className="max-w-[70ch] text-[15px] text-caliza-apagada">
        La contraseña la genera el sistema. Se muestra una sola vez al terminar
        el alta: téngala a mano para entregarla.
      </p>

      <BarraDeAcciones>
        <Boton type="submit" variante="primaria">
          Dar de alta
        </Boton>
        <EnlaceDeAccion href="/usuarios" variante="secundaria">
          Cancelar
        </EnlaceDeAccion>
      </BarraDeAcciones>
    </form>
  );
}
