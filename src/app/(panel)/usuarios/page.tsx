import { Plus } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import {
  AvisoDeClaveTemporal,
  type ConfirmacionDeUsuarios,
  claveMostradaDeLaPeticion,
  esquemaDeParametros,
  ListadoDeUsuarios,
  listarUsuarios,
  mensajeDeError,
} from "@/modules/usuarios";
import { contextoActual } from "@/shared/auth";
import { puedeAdministrarUsuarios } from "@/shared/auth/roles";
import {
  Aviso,
  EnlaceDeAccion,
  PaginaDePanel,
  PantallaDeMensaje,
} from "@/shared/ui";

export const metadata: Metadata = { title: "Usuarios" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const CONFIRMACIONES: Record<ConfirmacionDeUsuarios, string> = {
  alta: "La cuenta quedó creada.",
  restablecimiento: "La contraseña quedó restablecida.",
  baja: "La persona quedó dada de baja y ya no puede entrar.",
};

/**
 * La pantalla del `ADMIN_MUNICIPAL` (S1, S2). `(panel)/layout.tsx` ya exige
 * sesion; aca se decide si el rol alcanza, para no mostrar un listado que el
 * caso de uso va a rechazar igual — la misma regla que corre otra vez dentro
 * de `listarUsuarios`, porque ocultar una pantalla no es autorizacion
 * (`05-seguridad.md` seccion 6).
 *
 * La contrasenia temporal no viene por ningun parametro: el redirect trae
 * solo su token y la clave se lee de la cookie httpOnly
 * (`claveTemporalEnCookie.ts`, S4). Sin ese token la cookie no se toca, asi
 * que volver a esta pantalla no la vuelve a mostrar.
 *
 * `?error=` trae un codigo del vocabulario de `mensajesDeError.ts`, nunca el
 * texto del error: la URL la escribe cualquiera y reflejarla seria pintar
 * texto ajeno.
 */
export default async function PaginaDeUsuarios({ searchParams }: Props) {
  const contexto = await contextoActual();

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

  const analisis = esquemaDeParametros.safeParse(await searchParams);
  const parametros = analisis.success ? analisis.data : {};
  const usuarios = await listarUsuarios(contexto);
  const mostrada = await claveMostradaDeLaPeticion(parametros.clave);
  const nombre = mostrada
    ? usuarios.find((usuario) => usuario.id === mostrada.usuarioId)?.nombre
    : undefined;
  // `?error=` lleva un codigo, no texto: la pantalla pone el mensaje
  // (`mensajesDeError.ts`). Un codigo desconocido no muestra nada.
  const mensaje = mensajeDeError(parametros.error);

  return (
    <PaginaDePanel
      titulo="Usuarios"
      descripcion="Quién entra a este panel y con qué rol. Las cuentas son de este ayuntamiento."
      accion={
        <EnlaceDeAccion href="/usuarios/alta" variante="primaria">
          <Plus size={18} weight="bold" aria-hidden="true" />
          Nuevo usuario
        </EnlaceDeAccion>
      }
    >
      {mensaje ? <Aviso tono="error">{mensaje}</Aviso> : null}
      {parametros.ok ? (
        <Aviso tono="exito">{CONFIRMACIONES[parametros.ok]}</Aviso>
      ) : null}
      {mostrada && nombre ? (
        <AvisoDeClaveTemporal mostrada={mostrada} nombre={nombre} />
      ) : null}
      <ListadoDeUsuarios
        usuarios={usuarios}
        actor={{ id: contexto.usuario.id, rol: contexto.usuario.rol }}
      />
    </PaginaDePanel>
  );
}
