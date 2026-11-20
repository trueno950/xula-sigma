import { Plus } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import {
  AvisoDeClaveTemporal,
  claveMostradaDeLaPeticion,
  esquemaDeParametros,
  ListadoDeUsuarios,
  listarUsuarios,
  mensajeDeError,
} from "@/modules/usuarios";
import { avisoDeConfirmacion } from "@/modules/usuarios/ui/avisoDeConfirmacion";
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

/**
 * La pantalla del `ADMIN_MUNICIPAL` (S1, S2). `(panel)/layout.tsx` ya exige
 * sesion; aca se decide si el rol alcanza, para no mostrar un listado que el
 * caso de uso va a rechazar igual — la misma regla que corre otra vez dentro
 * de `listarUsuarios`, porque ocultar una pantalla no es autorizacion
 * (`05-seguridad.md` seccion 6).
 *
 * La contrasenia temporal no viene por ningun parametro: el redirect trae
 * solo su token, y el proxy pone la clave en una cabecera del request -que
 * la pagina lee y la cookie no- en la unica peticion que trae ese token
 * (`claveMostradaEnTransito.ts`, S4 y S2). Sin el token en la URL no hay
 * cabecera, asi que volver a esta pantalla no la muestra.
 *
 * `?error=` trae un codigo del vocabulario de `mensajesDeError.ts`, nunca el
 * texto del error: la URL la escribe cualquiera y reflejarla seria pintar
 * texto ajeno.
 *
 * La confirmacion de `?ok=` pasa por `avisoDeConfirmacion`: el exito de un
 * alta o un restablecimiento solo se anuncia junto a la contrasenia nueva,
 * porque el aviso existe por esa clave (S11).
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
  // La tarjeta se pinta con la clave **y** con el nombre de quien la
  // recibe; la confirmacion sigue a la tarjeta, no a la cabecera sola.
  const confirmacion = avisoDeConfirmacion({
    ok: parametros.ok,
    hayClaveVisible: Boolean(mostrada && nombre),
  });

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
      {confirmacion ? (
        <Aviso tono={confirmacion.tono}>{confirmacion.texto}</Aviso>
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
