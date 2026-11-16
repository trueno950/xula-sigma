import {
  BarraDeAcciones,
  Boton,
  Campo,
  CLASES_DE_FORMULARIO,
  GrupoDeCampos,
} from "@/shared/ui";
import { UMBRAL_DE_ATRASO_MAXIMO, UMBRAL_DE_ATRASO_MINIMO } from "../domain";
import { cambiarUmbralDeAtrasoAction } from "./actions/cambiarUmbralDeAtrasoAction";

/**
 * Server Component, `<form action={...}>` nativo sin `"use client"`: la
 * excepcion de `AGENTS.md` (seccion Server Actions). Precarga el umbral
 * guardado con `defaultValue`, que ya viene resuelto por
 * `leerUmbralDeAtraso` -un municipio sin fila recibe el valor por defecto, no
 * un campo vacio-.
 *
 * Sin `min`/`max` en el campo, y es a proposito: el rango lo dice el texto de
 * ayuda y lo hace cumplir la Server Action con un mensaje en espanol para la
 * operadora. La validacion nativa del navegador responde en el idioma del
 * navegador, no en el del municipio. Mismo criterio que `SelectorDePunto` con
 * las coordenadas.
 */
export function FormularioDeUmbralDeAtraso({ umbral }: { umbral: number }) {
  return (
    <form action={cambiarUmbralDeAtrasoAction} className={CLASES_DE_FORMULARIO}>
      <GrupoDeCampos titulo="Días sin atender">
        <Campo
          id="dias-de-atraso"
          name="diasDeAtraso"
          etiqueta="Días para marcar un reporte como atrasado"
          ayuda={`Del ${UMBRAL_DE_ATRASO_MINIMO} al ${UMBRAL_DE_ATRASO_MAXIMO}. Un reporte recibido que lleva esos días sin atenderse se marca como atrasado en la bandeja y en el mapa.`}
          type="number"
          inputMode="numeric"
          step={1}
          defaultValue={String(umbral)}
          required
          tipografia="dato"
        />
      </GrupoDeCampos>

      <BarraDeAcciones>
        <Boton type="submit" variante="primaria">
          Guardar
        </Boton>
      </BarraDeAcciones>
    </form>
  );
}
