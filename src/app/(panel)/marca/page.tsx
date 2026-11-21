import type { Metadata } from "next";
import {
  FormularioDeColores,
  FormularioDeEscudo,
  FormularioDeRestablecer,
  leerParametrosDeMarca,
  MENSAJE_DE_CONFIRMACION_DE_MARCA,
  MENSAJES_DE_ERROR_DE_MARCA,
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
 * `/marca`: el escudo y los colores con los que el municipio aparece en
 * todo el sistema.
 *
 * Ruta fina: lee el resultado que dejo el `redirect` de cada accion y
 * compone los tres formularios. `(panel)/layout.tsx` ya exige sesion; aca
 * solo se decide si el rol alcanza, para no mostrar formularios que las
 * Server Actions van a rechazar igual — misma regla, `puedeCambiarMarca`,
 * que corre otra vez dentro de cada caso de uso porque ocultar un boton no
 * es autorizacion (`05-seguridad.md` seccion 6).
 *
 * **La URL no trae texto, trae codigos** (S4): cada aviso de esta pantalla se
 * traduce aca desde los dos catalogos de `mensajesDeMarca.ts`, y un
 * `?error=` que no este en ellos no pinta nada. Asi una barra de direcciones
 * escrita a mano no pone palabras en la boca del sistema.
 *
 * Los colores se pintan desde el servidor (`variablesDeMarca` en el layout,
 * antipatron 13 de `AGENTS.md`): esta pagina solo los edita.
 */
export default async function PaginaDeMarca({ searchParams }: Props) {
  const contexto = await contextoActual();

  if (!contexto || !puedeCambiarMarca(contexto.usuario.rol)) {
    return (
      <PaginaDePanel titulo="Marca del ayuntamiento" ancho="formulario">
        <Aviso tono="aviso">{MENSAJES_DE_ERROR_DE_MARCA["sin-permiso"]}</Aviso>
      </PaginaDePanel>
    );
  }

  const parametros = leerParametrosDeMarca(await searchParams);
  const ayuntamiento = await exigirAyuntamiento();
  const marca = leerMarca(ayuntamiento.marca);

  return (
    <PaginaDePanel
      titulo="Marca del ayuntamiento"
      descripcion="El escudo y los colores con los que el municipio aparece en todo el sistema."
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

      <FormularioDeColores marca={marca} />
      <FormularioDeRestablecer />
      <FormularioDeEscudo error={parametros.escudo} />
    </PaginaDePanel>
  );
}
