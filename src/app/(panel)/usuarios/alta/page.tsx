import type { Metadata } from "next";
import {
  FormularioDeAltaDeUsuario,
  mensajeDeError,
  PantallaSinSesion,
  SinPermisoDeUsuarios,
} from "@/modules/usuarios";
import { borradorDeLaPeticion } from "@/modules/usuarios/ui/borradorEnCookie";
import { contextoActual } from "@/shared/auth";
import { puedeAdministrarUsuarios } from "@/shared/auth/roles";
import { Migaja, PaginaDePanel } from "@/shared/ui";

export const metadata: Metadata = { title: "Nuevo usuario" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const MIGAJA_DE_ALTA = (
  <Migaja
    pasos={[{ etiqueta: "Usuarios", href: "/usuarios" }, { etiqueta: "Alta" }]}
    etiqueta="Ruta"
  />
);

/**
 * El formulario de alta (S3). Ruta fina: resuelve el contexto, decide si el
 * rol alcanza y compone. El rechazo del servidor vuelve por `?error=` —el
 * `<form>` es nativo y su accion no devuelve `ActionResult<T>`— y con el
 * token de lo capturado en una cookie httpOnly (S6); el exito no vuelve aca:
 * termina en el listado, donde aparece la contrasenia temporal una sola vez
 * (S4).
 *
 * La migaja termina en «Alta» y no en «Nuevo usuario» (S8): el encabezado ya
 * nombra la pantalla, y repetir el mismo titulo dos veces es ruido, no
 * orientacion.
 *
 * Un rol que no administra usuarios ve este mismo encabezado y esta misma
 * migaja con el cuerpo de `SinPermisoDeUsuarios` (S15), no una pantalla
 * suelta: el aviso lo pone el modulo una sola vez y la ruta solo conserva lo
 * que es suyo.
 */
export default async function PaginaDeAltaDeUsuario({ searchParams }: Props) {
  const contexto = await contextoActual();

  if (!contexto) return <PantallaSinSesion />;
  if (!puedeAdministrarUsuarios(contexto.usuario.rol)) {
    return (
      <PaginaDePanel
        titulo="Nuevo usuario"
        ancho="formulario"
        migaja={MIGAJA_DE_ALTA}
      >
        <SinPermisoDeUsuarios rol={contexto.usuario.rol} />
      </PaginaDePanel>
    );
  }

  const parametros = await searchParams;
  // La URL solo lleva codigos (`mensajesDeError.ts`); uno desconocido no
  // muestra nada en vez de reflejar texto ajeno.
  const mensaje = mensajeDeError(parametros.error);
  const token =
    typeof parametros.borrador === "string" ? parametros.borrador : undefined;
  const borrador = await borradorDeLaPeticion(token);

  return (
    <PaginaDePanel
      titulo="Nuevo usuario"
      ancho="formulario"
      migaja={MIGAJA_DE_ALTA}
    >
      <FormularioDeAltaDeUsuario
        borrador={borrador}
        {...(mensaje ? { error: mensaje } : {})}
      />
    </PaginaDePanel>
  );
}
