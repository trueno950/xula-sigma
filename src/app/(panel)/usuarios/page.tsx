import { Plus } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import {
  AvisoDeAccion,
  AvisoDeClaveTemporal,
  ClaveQueYaNoSePuedeMostrar,
  DESCRIPCION_DE_USUARIOS,
  esquemaDeParametros,
  ListadoDeUsuarios,
  listarUsuarios,
  PantallaSinSesion,
  SinPermisoDeUsuarios,
} from "@/modules/usuarios";
import { avisosDeLaPeticion } from "@/modules/usuarios/ui/avisosDeLaPeticion";
import { contextoActual } from "@/shared/auth";
import { puedeAdministrarUsuarios } from "@/shared/auth/roles";
import { Aviso, EnlaceDeAccion, PaginaDePanel } from "@/shared/ui";

export const metadata: Metadata = { title: "Usuarios" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * La pantalla del `ADMIN_MUNICIPAL` (S1, S2). `(panel)/layout.tsx` ya exige
 * sesion; aca se decide si el rol alcanza, para no mostrar un listado que el
 * caso de uso va a rechazar igual — la misma regla que corre otra vez dentro
 * de `listarUsuarios`, porque ocultar una pantalla no es autorizacion
 * (`05-seguridad.md` seccion 6). Ese rechazo conserva el encabezado y la
 * descripcion de la pantalla (S15): el cuerpo cambia por `SinPermisoDeUsuarios`
 * y la accion —lo que el rol no puede hacer— no se pinta.
 *
 * Lo que la peticion anuncia lo resuelve `avisosDeLaPeticion`: la
 * contrasenia temporal que trajo el proxy, el aviso de un solo uso de la
 * baja, los codigos de error y el estado de «ya no se puede mostrar» (S11).
 * Aca solo se compone.
 */
export default async function PaginaDeUsuarios({ searchParams }: Props) {
  const contexto = await contextoActual();

  if (!contexto) return <PantallaSinSesion />;
  const actor = { id: contexto.usuario.id, rol: contexto.usuario.rol };
  if (!puedeAdministrarUsuarios(actor.rol)) {
    return (
      <PaginaDePanel titulo="Usuarios" descripcion={DESCRIPCION_DE_USUARIOS}>
        <SinPermisoDeUsuarios rol={actor.rol} />
      </PaginaDePanel>
    );
  }

  const analisis = esquemaDeParametros.safeParse(await searchParams);
  const parametros = analisis.success ? analisis.data : {};
  const usuarios = await listarUsuarios(contexto);
  const avisos = await avisosDeLaPeticion({ parametros, usuarios, actor });

  return (
    <PaginaDePanel
      titulo="Usuarios"
      descripcion={DESCRIPCION_DE_USUARIOS}
      accion={
        <EnlaceDeAccion href="/usuarios/alta" variante="primaria">
          <Plus size={18} weight="bold" aria-hidden="true" />
          Nuevo usuario
        </EnlaceDeAccion>
      }
    >
      {avisos.mensaje ? <Aviso tono="error">{avisos.mensaje}</Aviso> : null}
      {avisos.avisoYPersona ? (
        <AvisoDeAccion
          nombre={avisos.avisoYPersona.usuario.nombre}
          bajaEn={avisos.avisoYPersona.usuario.bajaEn}
          token={avisos.avisoYPersona.aviso.token}
        />
      ) : null}
      {avisos.confirmacion ? (
        <Aviso tono={avisos.confirmacion.tono}>
          {avisos.confirmacion.texto}
        </Aviso>
      ) : null}
      {avisos.clave.tipo === "sin-mostrar" ? (
        <ClaveQueYaNoSePuedeMostrar
          usuario={avisos.clave.usuario}
          puedeRestablecer={avisos.clave.puedeRestablecer}
        />
      ) : null}
      {avisos.clave.tipo === "visible" ? (
        <AvisoDeClaveTemporal
          mostrada={avisos.clave.mostrada}
          usuario={avisos.clave.usuario}
        />
      ) : null}
      <ListadoDeUsuarios usuarios={usuarios} actor={actor} />
    </PaginaDePanel>
  );
}
