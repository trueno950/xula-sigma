import type { NextConfig } from "next";

/**
 * Sin esto, el barrel de `@phosphor-icons/react` —miles de iconos en un
 * solo punto de entrada— hace lentísima la compilación en desarrollo.
 * `docs/06-frontend.md` sección 7 lo exige desde antes de que este archivo
 * existiera.
 *
 * `radix-ui` entra por el mismo motivo: su `index` reexporta unos treinta
 * paquetes `@radix-ui/react-*`, uno por primitivo (dialog, popover,
 * dropdown...), y Turbopack resuelve ese grafo entero en desarrollo aunque
 * un componente solo use uno.
 */
const configuracion: NextConfig = {
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react", "radix-ui"],
  },
};

export default configuracion;
