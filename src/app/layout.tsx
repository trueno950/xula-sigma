import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "leaflet/dist/leaflet.css";

/**
 * Layout raiz. Deliberadamente vacio de todo lo que sea de un municipio.
 *
 * Por aca pasan las tres superficies que distingue `proxy.ts` —`raiz`,
 * `admin` y `ayuntamiento`— y solo la ultima tiene un ayuntamiento del que
 * hablar. Resolver el tenant aca obligaria a que la raiz y el panel de
 * plataforma tambien tuvieran uno, o a inventar uno por defecto, que es
 * exactamente lo que el invariante 1 prohibe.
 *
 * La marca la inyecta el layout de cada superficie de municipio.
 */

export const metadata: Metadata = {
  title: { default: "XULA SIGMA", template: "%s · XULA SIGMA" },
  description: "Sistema integral de gestión municipal",
};

export default function LayoutRaiz({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
