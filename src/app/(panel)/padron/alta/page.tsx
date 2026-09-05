import { FormularioDeAltaDePersona } from "@/modules/padron";
import { contextoActual } from "@/shared/auth";
import { puedeEscribir } from "@/shared/auth/roles";
import {
  EnlaceDeAccion,
  Migaja,
  PaginaDePanel,
  PantallaDeMensaje,
} from "@/shared/ui";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

/**
 * Ruta fina: compone el formulario. `(panel)/layout.tsx` ya exige sesion;
 * aca solo se decide si el rol alcanza, para no mostrar un formulario que
 * la Server Action va a rechazar igual — misma regla, `puedeEscribir`, que
 * corre otra vez dentro de `altaDePersona` porque ocultar un boton no es
 * autorizacion (`05-seguridad.md` seccion 6).
 *
 * La pantalla del rol sin permiso lleva salida al padron: antes era un
 * parrafo suelto, y quien caia ahi por un enlace viejo se quedaba sin nada
 * donde hacer clic.
 */
export default async function PaginaDeAltaDePersona({ searchParams }: Props) {
  const contexto = await contextoActual();
  const { error } = await searchParams;

  if (!contexto || !puedeEscribir(contexto.usuario.rol)) {
    return (
      <PantallaDeMensaje
        mensaje="Su rol no tiene permiso para dar de alta personas."
        accion={
          <EnlaceDeAccion href="/padron">Volver al padron</EnlaceDeAccion>
        }
      />
    );
  }

  return (
    <PaginaDePanel
      titulo="Nueva persona"
      ancho="formulario"
      migaja={
        <Migaja
          pasos={[
            { etiqueta: "Padron", href: "/padron" },
            { etiqueta: "Nueva persona" },
          ]}
          etiqueta="Ruta"
        />
      }
    >
      <FormularioDeAltaDePersona {...(error ? { error } : {})} />
    </PaginaDePanel>
  );
}
