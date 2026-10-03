import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import "./globals.css";
import "leaflet/dist/leaflet.css";

/**
 * Un solo archivo variable, subconjunto latino, desde el repositorio: sin
 * peticion a terceros. El respaldo de sistema es el de `DESIGN.md`.
 */
const inter = localFont({
  src: "./fonts/InterVariable-latin.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--fuente-inter",
  fallback: ["system-ui", "Segoe UI", "Roboto", "sans-serif"],
});

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
    <html lang="es" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
