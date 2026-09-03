/**
 * Las clases que `DESIGN.md` seccion 5 declara, en un solo lugar.
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
 */
export const ANILLO_DE_FOCO =
  "outline-none focus-visible:outline focus-visible:outline-2 " +
  "focus-visible:outline-offset-2 focus-visible:outline-marca";

export const VARIANTES_DE_BOTON = [
  "primaria",
  "secundaria",
  "fantasma",
  "peligro",
] as const;

export type VarianteDeBoton = (typeof VARIANTES_DE_BOTON)[number];

/**
 * Compartido por todas las variantes: el alto tactil, el radio apenas
 * quebrado y el apagado por token. El `disabled:` va aca —y no por
 * variante— porque un boton inhabilitado deja de tener jerarquia: se apagan
 * todas igual.
 *
 * Sin contarlas: `peligro` entro despues y el comentario siguio diciendo
 * "las tres" sin que nada fallara. El numero vive en `VARIANTES_DE_BOTON`,
 * que es donde el tipo lo sostiene.
 */
const BASE_DE_BOTON =
  "inline-flex h-11 shrink-0 items-center justify-center gap-2 " +
  "rounded-sm px-4 text-[15px] font-medium transition-colors " +
  "disabled:pointer-events-none disabled:border-transparent " +
  "disabled:bg-caliza-relleno disabled:text-caliza-inhabilitado";

const POR_VARIANTE: Record<VarianteDeBoton, string> = {
  /** La voz prestada del municipio. Una sola por pantalla. */
  primaria: "bg-marca text-marca-texto hover:bg-acento",
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
   */
  peligro: "bg-senial-error text-caliza-lienzo hover:brightness-110",
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
  "h-11 w-full rounded-sm border bg-caliza-lienzo px-3 text-[15px] " +
  "text-caliza-tinta placeholder:text-caliza-inhabilitado " +
  `${opciones?.conError ? "border-senial-error" : "border-caliza-borde"} ` +
  ANILLO_DE_FOCO;

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
