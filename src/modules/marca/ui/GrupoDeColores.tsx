import { PALETA } from "@/shared/marca";
import { ANILLO_DE_FOCO, CLASES_DE_ETIQUETA } from "@/shared/ui/estilos";
import { seleccionDeColor, VALOR_LIBRE } from "./seleccionDeColor";

type Opcion = { nombre: string; valor: string; muestra: string | undefined };

/** La paleta mas la opcion que le da voz al selector libre. */
const opciones: readonly Opcion[] = [
  ...PALETA.map(({ nombre, valor }) => ({ nombre, valor, muestra: valor })),
  { nombre: "Otro color", valor: VALOR_LIBRE, muestra: undefined },
];

/**
 * La opcion de la paleta: alto tactil de 44px y el estado elegido por borde
 * y relleno, no solo por color — la muestra de al lado ya es color, y un
 * estado que solo cambia de color no se distingue del que no lo es.
 */
const CLASES_DE_OPCION =
  "flex h-11 items-center gap-2 rounded-md border border-caliza-borde " +
  "bg-caliza-lienzo px-3 text-[15px] text-caliza-tinta " +
  "peer-checked:border-marca peer-checked:bg-caliza-relleno peer-checked:font-semibold " +
  "peer-focus-visible:outline-solid peer-focus-visible:outline-2 " +
  "peer-focus-visible:outline-offset-2 peer-focus-visible:outline-marca";

type Props = {
  campo: "primario" | "secundario";
  etiqueta: string;
  actual: string | undefined;
};

/**
 * Las dos formas de elegir un color (S1, S3): las de la paleta, de un clic,
 * y el selector exacto para el municipio que trae el suyo.
 *
 * Son radios y no botones de envio: elegir no es guardar, y asi el mismo
 * `<form>` nativo manda el color elegido tambien sin JavaScript (S4). La
 * opcion "Otro color" es la que le da voz al selector; el servidor lee ese
 * campo solo cuando esa opcion esta marcada (`colorElegido`).
 */
export function GrupoDeColores({ campo, etiqueta, actual }: Props) {
  const seleccion = seleccionDeColor(actual);
  const idLibre = `${campo}Libre`;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={CLASES_DE_ETIQUETA}>{etiqueta}</legend>
      <div className="flex flex-wrap gap-2">
        {opciones.map(({ nombre, valor, muestra }) => (
          <label key={valor} className="cursor-pointer">
            <input
              type="radio"
              name={campo}
              value={valor}
              defaultChecked={seleccion.radio === valor}
              className="peer sr-only"
            />
            <span className={CLASES_DE_OPCION}>
              {muestra ? (
                <span
                  aria-hidden
                  className="size-5 rounded-full border border-caliza-divisor"
                  style={{ backgroundColor: muestra }}
                />
              ) : null}
              {nombre}
            </span>
          </label>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          id={idLibre}
          name={idLibre}
          type="color"
          defaultValue={seleccion.libre}
          aria-label={`Elegir ${etiqueta.toLowerCase()}`}
          className={`h-11 w-16 cursor-pointer rounded-md border border-caliza-borde bg-caliza-lienzo p-1 ${ANILLO_DE_FOCO}`}
        />
        <label htmlFor={idLibre} className={CLASES_DE_ETIQUETA}>
          Color exacto
        </label>
      </div>
    </fieldset>
  );
}
