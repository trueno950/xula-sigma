import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeFusionarPersonas } from "@/shared/auth/roles";
import { ANILLO_DE_FOCO } from "@/shared/ui/estilos";
import { fusionarPersonasAction } from "./actions/fusionarPersonas.action";

type Props = {
  contexto: ContextoActual;
  /** `searchParams.error`, puesto por la Server Action. */
  error?: string;
};

const CLASE_ETIQUETA = "text-[13px] font-medium text-caliza-apagada";
const CLASE_CAMPO = `h-11 rounded-sm border border-caliza-borde bg-caliza-lienzo px-3 text-[15px] text-caliza-tinta font-mono ${ANILLO_DE_FOCO}`;

/**
 * Visible solo si `puedeFusionarPersonas` (tasks.md 4.26). El resto de
 * `ui/` deja el chequeo de rol a la pagina que lo compone (`page.tsx` de
 * `/padron` con `puedeEscribir`) — aca no hay todavia una pagina propia
 * que sea ese punto de composicion, asi que el componente se guarda a si
 * mismo. `fusionarPersonasAction` vuelve a exigir el mismo permiso del
 * lado del caso de uso: ocultar el formulario es UX, no autorizacion
 * (`05-seguridad.md` seccion 6).
 */
export function FusionarPersonas({ contexto, error }: Props) {
  if (!puedeFusionarPersonas(contexto.usuario.rol)) return null;

  return (
    <form action={fusionarPersonasAction} className="flex flex-col gap-4">
      {error ? (
        <p role="alert" className="text-[15px] text-senial-error">
          {error}
        </p>
      ) : null}

      <label className="flex flex-col gap-1">
        <span className={CLASE_ETIQUETA}>
          Persona a fusionar (queda marcada, no se borra)
        </span>
        <input
          name="perdedoraId"
          type="text"
          required
          className={CLASE_CAMPO}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className={CLASE_ETIQUETA}>Persona destino (queda vigente)</span>
        <input name="ganadoraId" type="text" required className={CLASE_CAMPO} />
      </label>

      <button
        type="submit"
        className="h-11 rounded-sm bg-marca px-4 text-[15px] font-medium text-marca-texto"
      >
        Fusionar
      </button>
    </form>
  );
}
