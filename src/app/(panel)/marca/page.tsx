import type { Metadata } from "next";
import {
  DESCRIPCION_DE_MARCA,
  leerParametrosDeMarca,
  MENSAJE_DE_CONFIRMACION_DE_MARCA,
  MENSAJES_DE_ERROR_DE_MARCA,
  SeccionesDeMarca,
  SinPermisoDeMarca,
  SinSesionDeMarca,
  VistaPreviaDeMarca,
} from "@/modules/marca";
import { contextoActual } from "@/shared/auth";
import { puedeCambiarMarca } from "@/shared/auth/roles";
import { leerMarca } from "@/shared/marca";
import { exigirAyuntamiento } from "@/shared/tenancy/contexto";
import { Aviso, PaginaDePanel } from "@/shared/ui";

export const metadata: Metadata = { title: "Marca" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * `/marca`: la marca del municipio, arriba como se ve hoy y abajo tres filas
 * plegables para cambiarla (artboard `02-vista-previa-primero`, L5).
 *
 * Ruta fina: lee el resultado que dejo el `redirect` de cada accion y compone
 * la vista previa y las secciones. `(panel)/layout.tsx` ya exige sesion; aca
 * solo se decide si el rol alcanza, para no mostrar formularios que las Server
 * Actions van a rechazar igual — misma regla, `puedeCambiarMarca`, que corre
 * otra vez dentro de cada caso de uso porque ocultar un boton no es
 * autorizacion (`05-seguridad.md` seccion 6).
 *
 * Sin permiso la pantalla **conserva su encabezado** y dice cual es el rol de
 * quien mira, cual hace falta y a quien pedirlo (S16).
 *
 * **La URL no trae texto, trae codigos** (S4): cada aviso de esta pantalla se
 * traduce aca desde los dos catalogos de `mensajesDeMarca.ts`, y un `?error=`
 * que no este en ellos no pinta nada.
 *
 * Los colores se pintan desde el servidor (`variablesDeMarca` en el layout,
 * antipatron 13 de `AGENTS.md`): esta pagina solo los edita, y la vista previa
 * usa esos mismos tokens en vez de repetir el color guardado.
 */
export default async function PaginaDeMarca({ searchParams }: Props) {
  const contexto = await contextoActual();
  const parametros = leerParametrosDeMarca(await searchParams);

  if (!contexto || !puedeCambiarMarca(contexto.usuario.rol)) {
    return (
      <PaginaDePanel
        titulo="Marca del ayuntamiento"
        descripcion={DESCRIPCION_DE_MARCA}
        ancho="formulario"
      >
        {contexto ? (
          <SinPermisoDeMarca rol={contexto.usuario.rol} />
        ) : (
          <SinSesionDeMarca />
        )}
      </PaginaDePanel>
    );
  }

  const ayuntamiento = await exigirAyuntamiento();
  const marca = leerMarca(ayuntamiento.marca);

  return (
    <PaginaDePanel
      titulo="Marca del ayuntamiento"
      descripcion={DESCRIPCION_DE_MARCA}
      ancho="formulario"
    >
      {parametros.error ? (
        <Aviso tono="error">
          {MENSAJES_DE_ERROR_DE_MARCA[parametros.error]}
        </Aviso>
      ) : null}

      {parametros.ok ? (
        <Aviso tono="exito">
          {MENSAJE_DE_CONFIRMACION_DE_MARCA[parametros.ok]}
        </Aviso>
      ) : null}

      <VistaPreviaDeMarca nombre={ayuntamiento.nombre} marca={marca} />
      <SeccionesDeMarca
        nombre={ayuntamiento.nombre}
        marca={marca}
        errorDeEscudo={parametros.escudo}
      />
    </PaginaDePanel>
  );
}
