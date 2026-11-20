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
import type { BorradorDeAltaDeUsuario } from "./borradorDeAltaDeUsuario";
import {
  AVISO_DE_OBLIGATORIOS,
  AYUDA_DE_NOMBRE,
} from "./FormularioDeAltaDeUsuario.textos";
import { opcionesDeRol } from "./opcionesDeRol";

/**
 * Server Component, `<form action={...}>` nativo sin `"use client"`
 * (`AGENTS.md`, seccion Server Actions). El error vuelve por `?error=` y se
 * pinta arriba; el exito no vuelve aca sino al listado, porque es ahi donde
 * aparece la contrasenia temporal (S4).
 *
 * **Ningun campo lleva `required`, `minLength` ni `type="email"`.** Los tres
 * hacen que el navegador conteste con su propio mensaje, en su idioma y antes
 * de que el POST salga; el porque y el minimo del nombre viven en
 * `FormularioDeAltaDeUsuario.textos.ts`.
 */
type Props = {
  error?: string;
  /** Lo capturado en un alta rechazada (S6): el formulario vuelve lleno. */
  borrador?: BorradorDeAltaDeUsuario | null;
};

export function FormularioDeAltaDeUsuario({ error, borrador }: Props) {
  const campos = borrador?.campos;

  return (
    <form action={altaDeUsuarioAction} className={CLASES_DE_FORMULARIO}>
      {error ? <Aviso tono="error">{error}</Aviso> : null}

      <p className="max-w-[70ch] text-[15px] text-caliza-apagada">
        {AVISO_DE_OBLIGATORIOS}
      </p>

      <GrupoDeCampos titulo="Quién entra">
        <Campo
          id="usuario-nombre"
          name="nombre"
          etiqueta="Nombre completo"
          ayuda={AYUDA_DE_NOMBRE}
          maxLength={120}
          defaultValue={campos?.nombre ?? ""}
        />
        <Campo
          id="usuario-correo"
          name="email"
          type="text"
          inputMode="email"
          autoComplete="email"
          etiqueta="Correo"
          ayuda="Con este correo inicia sesión."
          maxLength={160}
          defaultValue={campos?.email ?? ""}
        />
      </GrupoDeCampos>

      <GrupoDeCampos titulo="Qué puede hacer">
        {/*
          `required={false}` pisa el `required` que pone `CampoDeLista`: el
          navegador no debe contestar por el servidor. El marcador sigue
          deshabilitado, asi que el rol no elegido no es un valor posible.
        */}
        <CampoDeLista
          id="usuario-rol"
          name="rol"
          etiqueta="Rol"
          marcador="Elija un rol"
          opciones={opcionesDeRol}
          required={false}
          defaultValue={campos?.rol ?? ""}
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
