/**
 * Extrae la clave del objeto a partir de la URL guardada en `marca.escudo`,
 * o `null` si el borrado no procede. Puro: sin IO, testeable en
 * milisegundos.
 *
 * Dos barreras, las dos de seguridad y no de comodidad:
 *
 * 1. El origen de `url` tiene que coincidir EXACTAMENTE con el de
 *    `urlBase` (`URL.parse(...).origin`, nunca `startsWith` sobre el
 *    string completo). `https://assets.example.com.evil.com` comparte el
 *    prefijo de texto con `https://assets.example.com` sin ser el mismo
 *    origen, y un borrado que confiara en el prefijo aceptaria esa URL.
 * 2. La clave resultante tiene que empezar exactamente con
 *    `{ayuntamientoId}/` — el segmento completo, no un prefijo de texto:
 *    `motul2/...` no es `motul/...`. Sin esta barrera, la URL
 *    `{urlBase}/{otroAyuntamiento}/x.png` — que RLS no protege, porque el
 *    DELETE al bucket corre fuera de Postgres — borraria el objeto de otro
 *    municipio.
 */
export function claveTenantDesdeUrl(
  urlBase: string,
  ayuntamientoId: string,
  url: string,
): string | null {
  const base = URL.parse(urlBase);
  const objetivo = URL.parse(url);

  if (!base || !objetivo || objetivo.origin !== base.origin) return null;

  const prefijoDeRuta = base.pathname.endsWith("/")
    ? base.pathname
    : `${base.pathname}/`;

  if (!objetivo.pathname.startsWith(prefijoDeRuta)) return null;

  const clave = objetivo.pathname.slice(prefijoDeRuta.length);

  return clave.startsWith(`${ayuntamientoId}/`) ? clave : null;
}
