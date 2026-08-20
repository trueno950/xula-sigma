/**
 * Contraste entre dos colores, en la escala de WCAG 2.
 *
 * Existe porque los colores los elige el municipio y algunos van a elegir
 * mal. Guinda con texto negro da 2.06 y es ilegible; quien lo eligio no lo
 * nota porque lo mira en su propio monitor. La reja va del lado del
 * sistema. Ver `docs/06-frontend.md` seccion 6.
 */

/**
 * WCAG 2 AA para texto normal. Se toma 4.5 y no el 3.0 de texto grande
 * porque `--primary` no pinta solo botones: pinta enlaces y estados de
 * foco, que van en cuerpo de texto.
 */
export const CONTRASTE_MINIMO = 4.5;

/** Un color en sRGB lineal, cada canal en [0, 1]. */
type Lineal = readonly [number, number, number];

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const OKLCH = /^oklch\(([^)]*)\)$/i;

const acotar = (valor: number): number => Math.min(1, Math.max(0, valor));

/**
 * La curva de transferencia de sRGB. Un canal de un `#rrggbb` viene
 * codificado con gamma, y sumar valores con gamma da un promedio que no
 * corresponde a ninguna luz real.
 */
const linealizar = (canal: number): number =>
  canal <= 0.04045 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4;

const desdeHex = (valor: string): Lineal | null => {
  const encontrado = HEX.exec(valor);

  if (!encontrado?.[1]) return null;

  const digitos = encontrado[1];
  const largo = digitos.length / 3;
  const canales = [0, 1, 2].map((indice) => {
    const trozo = digitos.slice(indice * largo, indice * largo + largo);

    return Number.parseInt(largo === 1 ? trozo + trozo : trozo, 16) / 255;
  });

  return canales.map(linealizar) as unknown as Lineal;
};

/**
 * Los tres numeros de `oklch(L C H)`. La claridad admite porcentaje; el
 * croma y el tono no. En CSS `100%` de croma vale 0.4 y aceptarlo aca
 * obligaria a cargar esa constante sin que nadie la escriba: la marca sale
 * de un selector de color, que emite numeros.
 */
const numerosDeOklch = (cuerpo: string): [number, number, number] | null => {
  const partes = cuerpo.trim().split(/\s+/);

  if (partes.length !== 3) return null;

  const numeros = partes.map((parte, indice) => {
    const porcentaje = parte.endsWith("%");

    if (porcentaje && indice !== 0) return Number.NaN;

    const numero = Number(porcentaje ? parte.slice(0, -1) : parte);

    return porcentaje ? numero / 100 : numero;
  });

  if (numeros.some(Number.isNaN)) return null;

  return numeros as [number, number, number];
};

/**
 * oklch a sRGB lineal, por oklab.
 *
 * Las constantes son las de la especificacion de CSS Color 4 (§ Converting
 * from Oklab to sRGB); no se derivan de nada de este repositorio.
 *
 * **Aproximacion conocida:** un color fuera del gamut de sRGB se acota
 * canal por canal. El navegador hace mapeo de gamut, que conserva mejor el
 * tono. La diferencia de luminancia es chica y el error empuja hacia el
 * extremo del canal, o sea hacia declarar MENOS contraste del real: falla
 * del lado de rechazar una marca legible, no de aceptar una ilegible.
 */
const desdeOklch = (valor: string): Lineal | null => {
  const encontrado = OKLCH.exec(valor);
  const numeros =
    encontrado?.[1] === undefined ? null : numerosDeOklch(encontrado[1]);

  if (!numeros) return null;

  const [claridad, croma, tono] = numeros;
  const radianes = (tono * Math.PI) / 180;
  const a = croma * Math.cos(radianes);
  const b = croma * Math.sin(radianes);

  const l = (claridad + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (claridad - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (claridad - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return [
    acotar(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    acotar(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    acotar(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
};

/**
 * La luminancia relativa de un color, o `null` si no se puede medir.
 *
 * `null` no es cero: es "no se". Un color que no se puede medir no se
 * puede garantizar legible, y quien pregunta decide que hacer con eso.
 */
export const luminancia = (valor: string): number | null => {
  const lineal = desdeHex(valor) ?? desdeOklch(valor);

  if (!lineal) return null;

  const [r, g, b] = lineal;

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** La razon de contraste, entre 1 y 21. `null` si alguno no se mide. */
export const contraste = (uno: string, otro: string): number | null => {
  const a = luminancia(uno);
  const b = luminancia(otro);

  if (a === null || b === null) return null;

  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};
