import type { NextConfig } from "next";

/**
 * Sin esto, el barrel de `@phosphor-icons/react` —miles de iconos en un
 * solo punto de entrada— hace lentísima la compilación en desarrollo.
 * `docs/06-frontend.md` sección 7 lo exige desde antes de que este archivo
 * existiera.
 */
const configuracion: NextConfig = {
  experimental: {
    optimizePackageImports: [
      "@phosphor-icons/react",
      "@phosphor-icons/react/ssr",
    ],
  },
};

export default configuracion;
