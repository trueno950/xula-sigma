import { inflateSync } from "node:zlib";

/**
 * El texto que un PDF de `@react-pdf/renderer` con fuentes estandar deja
 * para quien lo copia o lo busca: cada `Text` es un arreglo `TJ` de cadenas
 * hexadecimales dentro de un flujo comprimido. Une las piezas de cada
 * arreglo -el kerning parte una palabra en varias- y devuelve una linea por
 * arreglo.
 *
 * Es lo que sostiene decir "el PDF trae la marca": revisar solo las props de
 * la plantilla no prueba que el texto llegue al archivo.
 */
export const textoDePdf = (bytes: Uint8Array): string => {
  const crudo = Buffer.from(bytes).toString("latin1");
  const lineas: string[] = [];

  for (const flujo of crudo.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    const contenido = inflarOnulo(flujo[1] ?? "");
    if (contenido === null) continue;

    for (const arreglo of contenido.matchAll(/\[([^\]]*)\]\s*TJ/g)) {
      const piezas = [...(arreglo[1] ?? "").matchAll(/<([0-9a-f]*)>/gi)];
      lineas.push(
        piezas
          .map((p) => Buffer.from(p[1] ?? "", "hex").toString("latin1"))
          .join(""),
      );
    }
  }

  return lineas.join("\n");
};

// Las imagenes y otros flujos binarios del PDF no son zlib de texto.
const inflarOnulo = (flujo: string): string | null => {
  try {
    return inflateSync(Buffer.from(flujo, "latin1")).toString("latin1");
  } catch {
    return null;
  }
};
