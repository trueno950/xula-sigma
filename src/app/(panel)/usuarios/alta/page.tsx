import type { Metadata } from "next";
import { FormularioDeAltaDeUsuario, mensajeDeError } from "@/modules/usuarios";
import { contextoActual } from "@/shared/auth";
import { puedeAdministrarUsuarios } from "@/shared/auth/roles";
import {
  EnlaceDeAccion,
  Migaja,
  PaginaDePanel,
  PantallaDeMensaje,
} from "@/shared/ui";

export const metadata: Metadata = { title: "Nuevo usuario" };

type Props = {
  searchParams: Promise<{ error?: string | string[] }>;
};

/**
 * El formulario de alta (S3). Ruta fina: resuelve el contexto, decide si el
 * rol alcanza y compone. El rechazo del servidor vuelve por `?error=` —el
 * `<form>` es nativo y su accion no devuelve `ActionResult<T>`—, y el exito
 * no vuelve aca: termina en el listado, donde aparece la contrasenia
 * temporal una sola vez (S4).
 */
export default async function PaginaDeAltaDeUsuario({ searchParams }: Props) {
  const contexto = await contextoActual();
  const { error } = await searchParams;
  // La URL solo lleva codigos (`mensajesDeError.ts`); uno desconocido no
  // muestra nada en vez de reflejar texto ajeno.
  const mensaje = mensajeDeError(error);

  if (!contexto || !puedeAdministrarUsuarios(contexto.usuario.rol)) {
    return (
      <PantallaDeMensaje
        mensaje="Su rol no tiene permiso para administrar usuarios."
        accion={
          <EnlaceDeAccion href="/padron" variante="secundaria">
            Volver al padrón
          </EnlaceDeAccion>
        }
      />
    );
  }

  return (
    <PaginaDePanel
      titulo="Nuevo usuario"
      ancho="formulario"
      migaja={
        <Migaja
          pasos={[
            { etiqueta: "Usuarios", href: "/usuarios" },
            { etiqueta: "Nuevo usuario" },
          ]}
          etiqueta="Ruta"
        />
      }
    >
      <FormularioDeAltaDeUsuario {...(mensaje ? { error: mensaje } : {})} />
    </PaginaDePanel>
  );
}
