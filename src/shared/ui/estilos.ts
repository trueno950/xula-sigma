import { CheckCircle, Warning } from "@phosphor-icons/react/ssr";

/**
 * Las clases que `DESIGN.md`, "Components", declara, en un solo lugar.
 *
 * Existen porque no existian: `FormularioDeAltaDePersona`,
 * `SugerenciaDeDuplicados` y `BuscadorDePersonas` llevaban cada uno su
 * propia copia de la cadena del campo, y ya habian divergido en el foco.
 * Una constante copiada por archivo no tiene forma de mantenerse igual, y
 * el que quede viejo no avisa.
 *
 * Son funciones y no objetos de clases sueltas para que `estilos.test.ts`
 * pueda recorrer las variantes y afirmar los invariantes de `DESIGN.md`
 * sobre todas — el alto de 44px, el foco por `outline`, el apagado por
 * token. Es la unica forma de que esas reglas tengan CI.
 */

/**
 * `outline` y no `box-shadow` ni `ring-*`: el modo de alto contraste de
 * Windows descarta las sombras y conserva el contorno, y ese usuario es
 * real en un municipio (`DESIGN.md`, Do's).
 *
 * `focus-visible` y no `focus`: el anillo es para quien navega con teclado.
 * Al hacer clic con el mouse, el navegador no lo pinta.
 *
 * Sin `outline-none`: en Tailwind 4 escribe `--tw-outline-style: none` en el
 * mismo elemento, y `focus-visible:outline-2` lee esa variable, asi que el
 * anillo salia con `outline-style: none`. Medido en Chromium contra el CSS
 * compilado. El estilo va explicito en `focus-visible:outline-solid`.
 */
export const ANILLO_DE_FOCO =
  "focus-visible:outline-solid focus-visible:outline-2 " +
  "focus-visible:outline-offset-2 focus-visible:outline-marca";

/**
 * El enlace dentro de una ficha o un parrafo. Subrayado y en tinta, no solo
 * de otro color: el subrayado es lo que lo distingue del dato que lo
 * rodea. La marca no se usa como color de texto sobre claro (`DESIGN.md`,
 * seccion 2), asi que al pasar el cursor solo engrosa el subrayado.
 */
export const CLASES_DE_ENLACE =
  "text-caliza-tinta underline underline-offset-2 hover:decoration-2 " +
  ANILLO_DE_FOCO;

export const VARIANTES_DE_BOTON = [
  "primaria",
  "secundaria",
  "fantasma",
  "peligro",
] as const;

export type VarianteDeBoton = (typeof VARIANTES_DE_BOTON)[number];

/**
 * Compartido por todas las variantes: el alto tactil, el radio de 8px, el
 * movimiento de retroalimentacion y el apagado por token. Se anima solo
 * color, fondo, borde y `scale` (la propiedad que escribe `active:scale-*`
 * en Tailwind 4), nunca layout ni `transition-all`. El `disabled:` va aca —y no por
 * variante— porque un boton inhabilitado deja de tener jerarquia: se apagan
 * todas igual.
 *
 * Sin contarlas: `peligro` entro despues y el comentario siguio diciendo
 * "las tres" sin que nada fallara. El numero vive en `VARIANTES_DE_BOTON`,
 * que es donde el tipo lo sostiene.
 */
const BASE_DE_BOTON =
  "inline-flex h-11 shrink-0 items-center justify-center gap-2 " +
  "rounded-md px-[18px] text-[15px] font-semibold " +
  "transition-[color,background-color,border-color,scale] duration-150 " +
  "ease-salida active:scale-[0.98] " +
  "disabled:pointer-events-none disabled:border-transparent " +
  "disabled:bg-caliza-relleno disabled:text-caliza-inhabilitado";

const POR_VARIANTE: Record<VarianteDeBoton, string> = {
  /** La voz prestada del municipio. Una sola por pantalla. */
  primaria: "bg-marca text-marca-texto hover:bg-marca-hover",
  /** Se usa seguido pero no es la accion principal de la pantalla. */
  secundaria:
    "border border-caliza-borde bg-caliza-lienzo text-caliza-tinta " +
    "hover:bg-caliza-superficie",
  /** Cancelar, volver: presente pero sin peso visual. */
  fantasma:
    "text-caliza-apagada hover:bg-caliza-relleno hover:text-caliza-tinta",
  /**
   * Baja, cancelacion, borrado. Va con la senal de error y no con la marca
   * porque es el reverso del Don't de `DESIGN.md`: si la marca no puede
   * vestir un rol semantico, una accion destructiva tampoco puede vestirse
   * de marca. En un municipio de marca roja, "Dar de baja" y "Guardar"
   * eran literalmente el mismo boton.
   *
   * De contorno y no de relleno: una baja es rara e irreversible, no la
   * accion que la pantalla existe para hacer. Rellena competia con la
   * primaria por el peso visual. El icono lo pone quien la usa: la senal
   * nunca va sola en el color.
   */
  peligro:
    "border border-senial-error bg-caliza-lienzo text-senial-error " +
    "hover:bg-senial-error-suave",
};

export const clasesDeBoton = (variante: VarianteDeBoton = "secundaria") =>
  `${BASE_DE_BOTON} ${POR_VARIANTE[variante]} ${ANILLO_DE_FOCO}`;

/**
 * El campo de `DESIGN.md`, Inputs: fondo lienzo, borde de 3.54:1, 44px.
 *
 * El borde de error reemplaza al normal en vez de sumarse: dos clases de
 * borde en la misma cadena dependen del orden en que Tailwind las emita,
 * que no es el orden en que se escriben.
 */
export const clasesDeCampo = (opciones?: { conError?: boolean }) =>
  "h-11 w-full rounded-md border bg-caliza-lienzo px-3 text-[15px] " +
  "text-caliza-tinta placeholder:text-caliza-inhabilitado " +
  "transition-[border-color] duration-150 ease-salida " +
  `${opciones?.conError ? "border-senial-error" : "border-caliza-borde"} ` +
  ANILLO_DE_FOCO;

/**
 * La tarjeta de `DESIGN.md`: lienzo apoyado en el fondo por tono, borde de
 * 1px y sombra de reposo, en ese orden de importancia. Prohibido anidar.
 */
export const CLASES_DE_TARJETA =
  "rounded-lg border border-caliza-divisor bg-caliza-lienzo p-5 " +
  "text-caliza-tinta shadow-reposo";

/** Un formulario completo sobre una tarjeta: 20px de relleno, 24px desde `md`. */
export const CLASES_DE_FORMULARIO = `${CLASES_DE_TARJETA} flex flex-col gap-6 md:p-6`;

/**
 * El mensaje de error de un campo: fondo suave de la senal y texto. El
 * icono lo pone `MensajeDeError`; nunca solo el borde (`DESIGN.md`, Campos).
 */
export const CLASES_DE_ERROR_DE_CAMPO =
  "flex items-start gap-1.5 rounded-sm bg-senial-error-suave px-2 py-1.5 " +
  "text-[13px] font-medium text-senial-error";

/** Tipografia Label: etiqueta de campo, encabezado de tabla, metadato. */
export const CLASES_DE_ETIQUETA =
  "text-[13px] font-medium leading-tight text-caliza-apagada";

/**
 * Tipografia Dato con `tabular-nums`: CURP, folios y fechas. Sin la
 * numeracion tabular, dos folios de la misma longitud no alinean en
 * columna y la lista deja de leerse de un vistazo.
 */
export const CLASES_DE_DATO =
  "font-mono text-[14px] tabular-nums text-caliza-apagada";

/**
 * Icono, color y `role` segun el tono de `Aviso`. `role="alert"` solo en
 * el error: interrumpe la lectura del operador, y eso se justifica cuando
 * algo salio mal, no cuando salio bien (`DESIGN.md`, Do's).
 */
export const presentacionDeAviso = (tono: "error" | "exito" | "aviso") => ({
  Icono: tono === "exito" ? CheckCircle : Warning,
  color:
    tono === "error"
      ? "text-senial-error"
      : tono === "aviso"
        ? "text-senial-aviso"
        : "text-senial-exito",
  fondo:
    tono === "error"
      ? "bg-senial-error-suave"
      : tono === "aviso"
        ? "bg-senial-aviso-suave"
        : "bg-senial-exito-suave",
  role: tono === "error" ? ("alert" as const) : ("status" as const),
});

/**
 * El `grid-template-columns` de `Tabla`, a partir del ancho declarado por
 * columna. `minmax(0,1fr)` es el default: reparte el espacio sobrante sin
 * desbordar cuando el contenido es mas ancho que la fraccion.
 */
export const plantillaDeColumnas = (
  columnas: readonly { ancho?: string }[],
): string =>
  columnas.map((columna) => columna.ancho ?? "minmax(0,1fr)").join(" ");

/**
 * El `aria-describedby` de `CampoDeLista`: los ids de ayuda y error que
 * existen, en ese orden. `undefined` cuando no hay ninguno de los dos,
 * para no escribir el atributo vacio.
 */
export const descripcionDeCampo = (
  campo: { ayuda?: unknown; error?: unknown },
  ids: { idDeAyuda: string; idDeError: string },
): string | undefined =>
  [campo.ayuda ? ids.idDeAyuda : null, campo.error ? ids.idDeError : null]
    .filter(Boolean)
    .join(" ") || undefined;
