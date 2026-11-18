import {
  Aviso,
  BarraDeAcciones,
  Boton,
  Campo,
  CLASES_DE_ETIQUETA,
  CLASES_DE_FORMULARIO,
  GrupoDeCampos,
} from "@/shared/ui";
import { altaDePersonaAction } from "./actions/altaDePersona.action";
import { SugerenciaDeDuplicados } from "./SugerenciaDeDuplicados";

type Props = {
  /** `searchParams.error` de `/padron/alta`, puesto por la Server Action. */
  error?: string;
};

/**
 * S5 de `padron-ux`: los obligatorios se dicen en una linea, nombrando los
 * dos que no lo son, igual que el alta de reportes. Son los mismos dos que
 * `esquemaDeEntrada` de `altaDePersona.action.ts` acepta vacios: el segundo
 * apellido y la CURP.
 */
const LINEA_DE_OBLIGATORIOS =
  "Todos los campos son obligatorios, salvo el segundo apellido y la CURP.";

/**
 * S7 de `padron-ux`: en escritorio los tres nombres comparten una fila y la
 * CURP va con ellos, sin un grupo "Identificacion" para un solo campo.
 *
 * Nombres y primer apellido los dibuja `SugerenciaDeDuplicados`, una isla
 * cerrada que no se abre desde aca, asi que la fila la arma este contenedor:
 * dos tercios para la isla -que a su vez pone sus dos campos lado a lado- y
 * el tercio que queda para el segundo apellido. Los `label` de la isla usan
 * `gap-1` y `Campo` `gap-1.5`; sin igualarlos a partir de `lg` los tres
 * campos de la fila arrancan a distinta altura.
 */
const FILA_DE_NOMBRES = "grid gap-4 lg:grid-cols-3";
const DOS_CAMPOS_DENTRO_DE_LA_FILA =
  "lg:col-span-2 lg:[&>div]:grid lg:[&>div]:grid-cols-2 lg:[&>div]:gap-4 " +
  "lg:[&>div>label]:gap-1.5";

/**
 * Server Component (tasks.md 2.14): `<form action={altaDePersonaAction}>`
 * es un POST nativo del navegador, sin `"use client"`.
 *
 * Cuatro campos y ni uno mas (`DESIGN.md`, Don't): cada campo justifica que
 * existe. Los dos primeros los renderiza `SugerenciaDeDuplicados`
 * (`"use client"`, tasks.md 4.25) porque necesitan estado mientras se
 * escribe; sus inputs llevan el mismo `name`, asi que este `<form>` los
 * sigue leyendo igual al enviar.
 */
export function FormularioDeAltaDePersona({ error }: Props) {
  return (
    <form action={altaDePersonaAction} className={CLASES_DE_FORMULARIO}>
      {error ? <Aviso tono="error">{error}</Aviso> : null}

      <p className={CLASES_DE_ETIQUETA}>{LINEA_DE_OBLIGATORIOS}</p>

      <GrupoDeCampos titulo="Datos de la persona">
        <div className={FILA_DE_NOMBRES}>
          <div className={DOS_CAMPOS_DENTRO_DE_LA_FILA}>
            <SugerenciaDeDuplicados />
          </div>

          <Campo
            id="segundoApellido"
            name="segundoApellido"
            etiqueta="Segundo apellido"
            ayuda="Dejar vacío si la persona no lo usa."
          />
        </div>

        <Campo
          id="curp"
          name="curp"
          etiqueta="CURP"
          maxLength={18}
          ayuda="18 caracteres. Se puede completar después."
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
