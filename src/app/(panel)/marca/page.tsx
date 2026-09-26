import type { Metadata } from "next";
import { FormularioDeEscudo } from "@/modules/marca";
import { contextoActual } from "@/shared/auth";
import { puedeCambiarMarca } from "@/shared/auth/roles";
import { Aviso, Migaja, PaginaDePanel } from "@/shared/ui";

export const metadata: Metadata = { title: "Marca" };

const migaja = (
  <Migaja
    pasos={[
      { etiqueta: "Inicio", href: "/" },
      { etiqueta: "Escudo del ayuntamiento" },
    ]}
    etiqueta="Ruta"
  />
);

/**
 * Ruta fina: compone el formulario. `(panel)/layout.tsx` ya exige sesion;
 * aca solo se decide si el rol alcanza, para no mostrar un formulario que
 * la Server Action va a rechazar igual — misma regla, `puedeCambiarMarca`,
 * que corre otra vez dentro de `cambiarEscudo` porque ocultar un boton no
 * es autorizacion (`05-seguridad.md` seccion 6).
 */
export default async function PaginaDeMarca() {
  const contexto = await contextoActual();

  if (!contexto || !puedeCambiarMarca(contexto.usuario.rol)) {
    return (
      <PaginaDePanel
        titulo="Escudo del ayuntamiento"
        ancho="formulario"
        migaja={migaja}
      >
        <Aviso tono="aviso">
          Su rol no tiene permiso para cambiar la marca del ayuntamiento.
        </Aviso>
      </PaginaDePanel>
    );
  }

  return (
    <PaginaDePanel
      titulo="Escudo del ayuntamiento"
      ancho="formulario"
      migaja={migaja}
    >
      <FormularioDeEscudo />
    </PaginaDePanel>
  );
}
