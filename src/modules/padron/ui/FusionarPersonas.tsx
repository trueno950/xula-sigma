import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeFusionarPersonas } from "@/shared/auth/roles";
import { Boton, CLASES_DE_ETIQUETA, clasesDeCampo } from "@/shared/ui";
import { fusionarPersonasAction } from "./actions/fusionarPersonas.action";

/** Una persona parecida, con lo que la operadora necesita para reconocerla. */
export type CandidatoAFusionar = {
  id: string;
  etiqueta: string;
};

type Props = {
  contexto: ContextoActual;
  /** Esta ficha: la que se conserva y la que se queda con lo de la otra. */
  ganadoraId: string;
  /**
   * Las personas parecidas que la página ya buscó. Elegir la duplicada por
   * nombre en vez de escribir su id es lo que vuelve usable la fusión: el id
   * crudo no aparece en ningún lado de la pantalla.
   */
  candidatos: readonly CandidatoAFusionar[];
};

/**
 * Visible solo si `puedeFusionarPersonas` (S12). `fusionarPersonasAction`
 * vuelve a exigir el mismo permiso del lado del caso de uso: ocultar el
 * formulario es UX, no autorización (`05-seguridad.md` sección 6).
 *
 * Sin personas parecidas no se pinta el `<select>`: un formulario que solo
 * puede responder con un error es un callejón, y el aviso dice dónde sí hay
 * candidatas.
 */
export function FusionarPersonas({ contexto, ganadoraId, candidatos }: Props) {
  if (!puedeFusionarPersonas(contexto.usuario.rol)) return null;

  if (candidatos.length === 0) {
    return (
      <p className="text-[15px] text-caliza-apagada">
        No se encontraron personas parecidas a esta ficha. Revise el listado del
        padrón.
      </p>
    );
  }

  return (
    <form action={fusionarPersonasAction} className="flex flex-col gap-3.5">
      <input type="hidden" name="ganadoraId" value={ganadoraId} />
      <label
        htmlFor={`fusionar-${ganadoraId}`}
        className="flex flex-col gap-1.5"
      >
        <span className={CLASES_DE_ETIQUETA}>
          Persona a fusionar (queda marcada, no se borra)
        </span>
        <select
          id={`fusionar-${ganadoraId}`}
          name="perdedoraId"
          required
          defaultValue=""
          className={clasesDeCampo()}
        >
          <option value="">Seleccione la persona duplicada</option>
          {candidatos.map((candidato) => (
            <option key={candidato.id} value={candidato.id}>
              {candidato.etiqueta}
            </option>
          ))}
        </select>
      </label>
      <p className={CLASES_DE_ETIQUETA}>
        Esta ficha se conserva: el domicilio y la CURP de la persona elegida se
        fusionan en ella.
      </p>
      <Boton type="submit" variante="secundaria">
        Fusionar
      </Boton>
    </form>
  );
}
