import Link from "next/link";
import {
  BarraDeAcciones,
  Boton,
  CampoDeLista,
  CLASES_DE_ENLACE,
  CLASES_DE_ETIQUETA,
  CLASES_DE_FORMULARIO,
  GrupoDeCampos,
  type OpcionDeLista,
} from "@/shared/ui";
import type { ObraDeReporte } from "../application/obrasDeReporte";
import { ETIQUETA_DE_TIPO_DE_INTERVENCION } from "../domain";
import { programarObraAction } from "./actions/programarObraAction";

type Props = {
  reporteId: string;
  tipos: readonly OpcionDeLista[];
  /**
   * Dentro de un contenedor que ya titula la accion -el desplegable del panel
   * de acciones del reporte (S14 de `reportes-ux`)-: sin tarjeta propia y sin
   * repetir el titulo, porque `CLASES_DE_TARJETA` prohibe anidarlas.
   */
  embebido?: boolean;
  /**
   * Las obras que este reporte ya tiene, leidas en el servidor bajo RLS
   * (S16). Se muestran arriba del formulario: la auditoria hallo que la
   * pantalla dejaba programar sin decir que ya habia una obra.
   */
  obras?: readonly ObraDeReporte[];
};

const AVISO_DE_OBRA_EXISTENTE = "Este reporte ya tiene una obra programada.";
const AVISO_DE_OBRAS_EXISTENTES = "Este reporte ya tiene obras programadas.";

/**
 * «Ver la obra» de S16, y el tipo entre parentesis cuando hay mas de una: dos
 * enlaces con el mismo texto en la misma lista no se distinguen ni de vista ni
 * con un lector de pantalla.
 */
const enlaceDeObra = (obras: readonly ObraDeReporte[], obra: ObraDeReporte) =>
  obras.length === 1
    ? "Ver la obra"
    : `Ver la obra (${ETIQUETA_DE_TIPO_DE_INTERVENCION[obra.tipo]})`;

function ObrasDelReporte({ obras }: { obras: readonly ObraDeReporte[] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className={CLASES_DE_ETIQUETA}>
        {obras.length === 1
          ? AVISO_DE_OBRA_EXISTENTE
          : AVISO_DE_OBRAS_EXISTENTES}
      </p>
      <ul className="flex flex-col gap-1.5">
        {obras.map((obra) => (
          <li key={obra.id}>
            <Link
              href={`/intervenciones/${obra.id}`}
              className={`rounded-sm ${CLASES_DE_ENLACE}`}
            >
              {enlaceDeObra(obras, obra)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CamposDeLaObra({
  reporteId,
  tipos,
}: {
  reporteId: string;
  tipos: readonly OpcionDeLista[];
}) {
  return (
    <>
      <p className={CLASES_DE_ETIQUETA}>
        La fecha de la obra será hoy y el lugar se copia del reporte.
      </p>
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
    </>
  );
}

/**
 * «Programar obra» del detalle del reporte (S2): formulario nativo sin
 * `"use client"`, con su fila en la tabla de excepciones de `AGENTS.md`. No
 * pide ubicacion -se copia del reporte- ni fecha: la obra queda planificada
 * con la fecha civil de hoy y se corrige desde su detalle.
 *
 * Lo que si dice, desde S17 (P2), es justamente eso: que la fecha sera hoy y
 * que el lugar viene del reporte, antes de escribir y no despues de guardar.
 *
 * Con obras ya programadas las muestra arriba del formulario, y el formulario
 * sigue disponible: S16 pide mostrarlas -programar a ciegas es el hallazgo-,
 * no prohibir una segunda obra sobre el mismo reporte.
 */
export function ProgramarObra({
  reporteId,
  tipos,
  embebido = false,
  obras = [],
}: Props) {
  return (
    <div className={embebido ? "flex flex-col gap-4" : "flex flex-col gap-6"}>
      {obras.length > 0 ? <ObrasDelReporte obras={obras} /> : null}

      <form
        action={programarObraAction}
        className={embebido ? "flex flex-col gap-4" : CLASES_DE_FORMULARIO}
      >
        <input type="hidden" name="reporteId" value={reporteId} />

        {embebido ? (
          <CamposDeLaObra reporteId={reporteId} tipos={tipos} />
        ) : (
          <GrupoDeCampos titulo="Obra a programar">
            <CamposDeLaObra reporteId={reporteId} tipos={tipos} />
          </GrupoDeCampos>
        )}

        <BarraDeAcciones>
          <Boton type="submit" variante={embebido ? "secundaria" : "primaria"}>
            Programar obra
          </Boton>
        </BarraDeAcciones>
      </form>
    </div>
  );
}
