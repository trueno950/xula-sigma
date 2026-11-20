import { ANILLO_DE_FOCO, Boton, CLASES_DE_ETIQUETA } from "@/shared/ui";
import type { IntervencionGuardada } from "../application/puertos";
import { corregirIntervencionAction } from "./actions/corregirIntervencionAction";
import { AvisoDePrivacidad } from "./avisoDePrivacidad";
import { AYUDA_DE_DESCRIPCION } from "./FormularioDeAltaDeIntervencion.textos";

type Props = {
  intervencion: IntervencionGuardada;
};

const ID_DE_AVISO = "correccion-descripcion-aviso";
const ID_DE_AYUDA = "correccion-descripcion-ayuda";

/**
 * La correccion de S13: la descripcion, nada mas. `corregirIntervencionAction`
 * arma el resto de la fila con lo guardado y solo reemplaza este campo, asi
 * que el formulario no manda ids que el cliente podria cambiar.
 *
 * El minimo no lo hace cumplir `minLength` (seguimiento de L11 en
 * `odd/tasks/intervenciones-ux.md`): su mensaje sale en el idioma del
 * navegador y no existe sin JavaScript. Lo exige el servidor con
 * `MENSAJE_DESCRIPCION_CORTA`, y la ayuda y el aviso de privacidad son los
 * mismos textos del alta, con un solo hogar.
 */
export function FormularioDeCorreccion({ intervencion }: Props) {
  return (
    <form action={corregirIntervencionAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={intervencion.id} />

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="intervencion-descripcion"
          className={CLASES_DE_ETIQUETA}
        >
          Descripción
        </label>
        <textarea
          id="intervencion-descripcion"
          name="descripcion"
          required
          maxLength={1000}
          rows={4}
          aria-describedby={`${ID_DE_AVISO} ${ID_DE_AYUDA}`}
          defaultValue={intervencion.descripcion}
          className={`w-full rounded-md border border-caliza-borde bg-caliza-lienzo px-3 py-2 text-[15px] text-caliza-tinta ${ANILLO_DE_FOCO}`}
        />
        <AvisoDePrivacidad id={ID_DE_AVISO} />
        <p id={ID_DE_AYUDA} className={CLASES_DE_ETIQUETA}>
          {AYUDA_DE_DESCRIPCION}
        </p>
      </div>

      <Boton type="submit" variante="secundaria">
        Guardar corrección
      </Boton>
    </form>
  );
}
