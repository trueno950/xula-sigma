import { ANILLO_DE_FOCO, Boton, CLASES_DE_ETIQUETA } from "@/shared/ui";
import type { IntervencionGuardada } from "../application/puertos";
import { corregirIntervencionAction } from "./actions/corregirIntervencionAction";

type Props = {
  intervencion: IntervencionGuardada;
};

export function FormularioDeCorreccion({ intervencion }: Props) {
  return (
    <form action={corregirIntervencionAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={intervencion.id} />

      <div className="flex flex-col gap-1">
        <label
          htmlFor="intervencion-descripcion"
          className={CLASES_DE_ETIQUETA}
        >
          Descripción corregida
        </label>
        <textarea
          id="intervencion-descripcion"
          name="descripcion"
          required
          minLength={10}
          maxLength={1000}
          rows={4}
          defaultValue={intervencion.descripcion}
          className={`w-full rounded-sm border border-caliza-borde bg-caliza-lienzo px-3 py-2 text-[15px] text-caliza-tinta ${ANILLO_DE_FOCO}`}
        />
        <p className={CLASES_DE_ETIQUETA}>
          No anote nombres, teléfonos ni datos de vecinos.
        </p>
      </div>

      <Boton type="submit" variante="primaria">
        Guardar corrección
      </Boton>
    </form>
  );
}
