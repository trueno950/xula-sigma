import {
  Aviso,
  BarraDeAcciones,
  Boton,
  Campo,
  CampoDeLista,
  CLASES_DE_ETIQUETA,
  CLASES_DE_FORMULARIO,
  GrupoDeCampos,
  type OpcionDeLista,
} from "@/shared/ui";
import { altaDeIntervencionAction } from "./actions/altaDeIntervencionAction";

type Props = {
  tipos: readonly OpcionDeLista[];
  lugares: readonly OpcionDeLista[];
  /** Todas las calles del municipio, etiquetadas con su lugar. */
  calles: readonly OpcionDeLista[];
  /** `hoyEnMerida()`: la fecha civil de hoy, que es la de una obra de mostrador. */
  fechaDeHoy: string;
  error?: string;
};

/**
 * El alta de S1, Server Component con `<form action>` nativo sin `"use client"`
 * -la excepcion de `AGENTS.md`, seccion Server Actions, con su fila en la
 * tabla-. La calle es opcional: una obra puede registrarse solo por lugar.
 */
export function FormularioDeAltaDeIntervencion({
  tipos,
  lugares,
  calles,
  fechaDeHoy,
  error,
}: Props) {
  return (
    <form action={altaDeIntervencionAction} className={CLASES_DE_FORMULARIO}>
      {error ? <Aviso tono="error">{error}</Aviso> : null}

      <GrupoDeCampos titulo="Qué trabajo y dónde">
        <CampoDeLista
          id="intervencion-tipo"
          name="tipo"
          etiqueta="Tipo de obra"
          marcador="Seleccione un tipo"
          opciones={tipos}
        />
        <CampoDeLista
          id="intervencion-lugar"
          name="lugarId"
          etiqueta="Lugar"
          marcador="Seleccione un lugar"
          opciones={lugares}
        />
        <CampoDeLista
          id="intervencion-calle"
          name="calleId"
          etiqueta="Calle (opcional)"
          marcador="Sin calle"
          opcional
          opciones={calles}
        />
        <Campo
          id="intervencion-fecha"
          name="fechaDeOcurrencia"
          etiqueta="Fecha de ocurrencia"
          type="date"
          required
          defaultValue={fechaDeHoy}
          tipografia="dato"
          ayuda="El día en que se hizo el trabajo, no el día en que se captura."
        />
      </GrupoDeCampos>

      <GrupoDeCampos titulo="Detalle del trabajo">
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
            minLength={10}
            maxLength={1000}
            rows={4}
            className="w-full rounded-md border border-caliza-borde bg-caliza-lienzo px-3 py-2 text-[15px] text-caliza-tinta"
          />
          <p className={CLASES_DE_ETIQUETA}>
            No anote nombres, teléfonos ni datos de vecinos. Describa el
            trabajo: qué se hizo, no quién lo pidió.
          </p>
        </div>
      </GrupoDeCampos>

      <BarraDeAcciones>
        <Boton type="submit" variante="primaria">
          Registrar intervención
        </Boton>
      </BarraDeAcciones>
    </form>
  );
}
