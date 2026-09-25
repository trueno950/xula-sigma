import type { NextConfig } from "next";

/**
 * El limite de cuerpo de una Server Action, que aplica a todas y no solo a
 * `/marca`. El defecto de Next es 1 MB, y el escudo admite hasta 1 MiB mas
 * la envoltura multipart: con el defecto, un archivo de 1 MiB exacto --que
 * la validacion de `marca` acepta-- nunca llegaba a la accion, y uno mayor
 * tampoco, asi que la operadora no veia el mensaje de peso.
 */
const LIMITE_DE_CUERPO_DE_ACCIONES = "2mb";

/**
 * Sin `optimizePackageImports`, el barrel de `@phosphor-icons/react` —miles
 * de iconos en un solo punto de entrada— hace lentísima la compilación en
 * desarrollo. `docs/06-frontend.md` sección 7 lo exige desde antes de que
 * este archivo existiera.
 */
const configuracion: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: LIMITE_DE_CUERPO_DE_ACCIONES },
    optimizePackageImports: [
      "@phosphor-icons/react",
      "@phosphor-icons/react/ssr",
    ],
  },
};

export default configuracion;
