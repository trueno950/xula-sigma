import {
  BarraDeAcciones,
  Boton,
  CampoDeLista,
  CLASES_DE_ETIQUETA,
  CLASES_DE_FORMULARIO,
  GrupoDeCampos,
  type OpcionDeLista,
} from "@/shared/ui";
import { programarObraAction } from "./actions/programarObraAction";

type Props = {
  reporteId: string;
  tipos: readonly OpcionDeLista[];
};

/**
 * «Programar obra» del detalle del reporte (S2): formulario nativo sin
 * `"use client"`, con su fila en la tabla de excepciones de `AGENTS.md`. No
 * pide ubicacion -se copia del reporte- ni fecha: la obra queda planificada
 * con la fecha civil de hoy y se corrige desde su detalle.
 */
export function ProgramarObra({ reporteId, tipos }: Props) {
  return (
    <form action={programarObraAction} className={CLASES_DE_FORMULARIO}>
      <input type="hidden" name="reporteId" value={reporteId} />

      <GrupoDeCampos titulo="Obra a programar">
        <CampoDeLista
          id={`tipo-obra-${reporteId}`}
          name="tipo"
          etiqueta="Tipo de obra"
          marcador="Seleccione un tipo"
          opciones={tipos}
        />
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`descripcion-obra-${reporteId}`}
            className={CLASES_DE_ETIQUETA}
          >
            Descripción del trabajo
          </label>
          <textarea
            id={`descripcion-obra-${reporteId}`}
            name="descripcion"
            required
            minLength={10}
            maxLength={1000}
            rows={3}
            className="w-full rounded-md border border-caliza-borde bg-caliza-lienzo px-3 py-2 text-[15px] text-caliza-tinta"
          />
          <p className={CLASES_DE_ETIQUETA}>
            No anote nombres, teléfonos ni datos de vecinos.
          </p>
        </div>
      </GrupoDeCampos>

      <BarraDeAcciones>
        <Boton type="submit" variante="primaria">
          Programar obra
        </Boton>
      </BarraDeAcciones>
    </form>
  );
}
