import {
  ANILLO_DE_FOCO,
  Aviso,
  BarraDeAcciones,
  Boton,
  Campo,
  CLASES_DE_ETIQUETA,
  CLASES_DE_FORMULARIO,
  GrupoDeCampos,
  type OpcionDeLista,
} from "@/shared/ui";
import { altaDeReporteAction } from "./actions/altaDeReporteAction";
import type { OpcionDeCalle } from "./SelectorDeUbicacionYTipo";
import { SelectorDeUbicacionYTipo } from "./SelectorDeUbicacionYTipo";

type Props = {
  lugares: readonly OpcionDeLista[];
  calles: readonly OpcionDeCalle[];
  tipos: readonly OpcionDeLista[];
  /** `searchParams.error`, puesto por `altaDeReporteAction`. */
  error?: string;
};

/**
 * Server Component, `<form action={altaDeReporteAction}>` nativo sin
 * `"use client"` (tasks.md 7.7): la excepcion de `AGENTS.md`, seccion
 * Server Actions. `descripcion` y `referencia` son las dos cajas de texto
 * libre del modulo (decision 13 de `proposal.md`): llevan la advertencia
 * explicita de no anotar datos de vecinos y el mismo largo acotado que
 * `validacionDeReporte.ts` valida en el servidor.
 */
export function FormularioDeAlta({ lugares, calles, tipos, error }: Props) {
  return (
    <form action={altaDeReporteAction} className={CLASES_DE_FORMULARIO}>
      {error ? <Aviso tono="error">{error}</Aviso> : null}

      <GrupoDeCampos titulo="Dónde y qué pasó">
        <SelectorDeUbicacionYTipo
          lugares={lugares}
          calles={calles}
          tipos={tipos}
        />
      </GrupoDeCampos>

      <GrupoDeCampos titulo="Detalle de la incidencia">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reporte-descripcion" className={CLASES_DE_ETIQUETA}>
            Descripción
          </label>
          <textarea
            id="reporte-descripcion"
            name="descripcion"
            required
            minLength={10}
            maxLength={1000}
            rows={4}
            className={`w-full rounded-md border border-caliza-borde bg-caliza-lienzo px-3 py-2 text-[15px] text-caliza-tinta transition-[border-color] duration-150 ease-salida ${ANILLO_DE_FOCO}`}
          />
          <p className={CLASES_DE_ETIQUETA}>
            No anote nombres, teléfonos ni datos de vecinos. Describa la
            incidencia: que es, no quien la reporta.
          </p>
        </div>

        <Campo
          id="reporte-referencia"
          name="referencia"
          etiqueta="Referencia"
          maxLength={200}
          ayuda="Una seña para encontrar el punto: frente a la tienda, junto a la cancha. No anote nombres ni domicilios de vecinos."
        />
      </GrupoDeCampos>

      <BarraDeAcciones>
        <Boton type="submit" variante="primaria">
          Registrar reporte
        </Boton>
      </BarraDeAcciones>
    </form>
  );
}
