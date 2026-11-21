/**
 * El escudo guardado, con el tamano que le da quien lo usa.
 *
 * `next/image` exigiria declarar el host de R2 en `remotePatterns`, y el
 * escudo lo sube cada municipio a una URL que la plataforma no elige. Vive en
 * un solo lugar para que la excepcion de Biome —y el `alt` vacio, porque el
 * nombre del municipio va al lado en texto— se escriba una vez.
 */
export function ImagenDeEscudo({
  escudo,
  className,
}: {
  escudo: string;
  className: string;
}) {
  // biome-ignore lint/performance/noImgElement: host externo por municipio
  return <img src={escudo} alt="" className={className} />;
}
