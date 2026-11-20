import {
  ANILLO_DE_FOCO,
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
import { AvisoDePrivacidad } from "./avisoDePrivacidad";
import type { BorradorDeIntervencion } from "./borradorDeIntervencion";
import type { CallesDelAlta } from "./FormularioDeAltaDeIntervencion.calles";
import { SelectorDeCalleDelLugar } from "./FormularioDeAltaDeIntervencion.selector";
import {
  AVISO_DE_OBLIGATORIOS,
  AYUDA_DE_DESCRIPCION,
} from "./FormularioDeAltaDeIntervencion.textos";

type Props = {
  tipos: readonly OpcionDeLista[];
  lugares: readonly OpcionDeLista[];
  /** Las calles del municipio por asentamiento y el de cada lugar (S6). */
  calles: CallesDelAlta;
  /** `hoyEnMerida()`: la fecha civil de hoy, que es la de una obra de mostrador. */
  fechaDeHoy: string;
  error?: string;
  /** Lo capturado en un alta rechazada (S8): el formulario vuelve lleno. */
  borrador?: BorradorDeIntervencion | null;
};

/**
 * El alta de S1, Server Component con `<form action>` nativo sin `"use client"`
 * -la excepcion de `AGENTS.md`, seccion Server Actions, con su fila en la
 * tabla-. La calle es opcional: una obra puede registrarse solo por lugar, y
 * se elige entre las del asentamiento del lugar (S6).
 *
 * El mínimo de la descripción lo hace cumplir el servidor y no `minLength`
 * (S7): el mensaje del navegador sale en su idioma y no existe sin
 * JavaScript. Lo que la operadora lee antes de escribir es la ayuda, que sale
 * del mismo `MINIMO_DE_DESCRIPCION`.
 */
export function FormularioDeAltaDeIntervencion({
  tipos,
  lugares,
  calles,
  fechaDeHoy,
  error,
  borrador,
}: Props) {
  const campos = borrador?.campos;

  return (
    <form action={altaDeIntervencionAction} className={CLASES_DE_FORMULARIO}>
      {error ? <Aviso tono="error">{error}</Aviso> : null}

      <p className={CLASES_DE_ETIQUETA}>{AVISO_DE_OBLIGATORIOS}</p>

      <GrupoDeCampos titulo="Qué trabajo y dónde">
        <CampoDeLista
          id="intervencion-tipo"
          name="tipo"
          etiqueta="Tipo de obra"
          marcador="Seleccione un tipo"
          opciones={tipos}
          defaultValue={campos?.tipo ?? ""}
        />
        <CampoDeLista
          id="intervencion-lugar"
          name="lugarId"
          etiqueta="Lugar"
          marcador="Seleccione un lugar"
          opciones={lugares}
          defaultValue={campos?.lugarId ?? ""}
        />
        <SelectorDeCalleDelLugar
          calles={calles}
          {...(campos
            ? {
                elegido: { lugarId: campos.lugarId, calleId: campos.calleId },
              }
            : {})}
        />
        <Campo
          id="intervencion-fecha"
          name="fechaDeOcurrencia"
          etiqueta="Fecha de ocurrencia"
          type="date"
          required
          defaultValue={campos?.fechaDeOcurrencia ?? fechaDeHoy}
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
            maxLength={1000}
            rows={4}
            aria-describedby="intervencion-descripcion-aviso intervencion-descripcion-ayuda"
            defaultValue={campos?.descripcion ?? ""}
            className={`w-full rounded-md border border-caliza-borde bg-caliza-lienzo px-3 py-2 text-[15px] text-caliza-tinta ${ANILLO_DE_FOCO}`}
          />
          <AvisoDePrivacidad id="intervencion-descripcion-aviso" />
          <p id="intervencion-descripcion-ayuda" className={CLASES_DE_ETIQUETA}>
            {AYUDA_DE_DESCRIPCION}
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
