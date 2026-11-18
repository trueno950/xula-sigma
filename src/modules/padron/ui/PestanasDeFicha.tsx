import { type Pestana, Pestanas } from "@/shared/ui";

/**
 * S11 de `padron-ux` (L7): las dos secciones de la ficha. Son enlaces con
 * el estado en la URL, no radios con CSS: el servidor pinta la pestaña
 * activa, la pantalla se comparte y se recarga donde estaba, y sin
 * JavaScript sigue navegando.
 */
export const PESTANAS_DE_FICHA = ["residencias", "administrar"] as const;
export type PestanaDeFicha = (typeof PESTANAS_DE_FICHA)[number];

/** Lo que se lee: el historial. Administrar reescribe la ficha. */
export const PESTANA_POR_DEFECTO: PestanaDeFicha = "residencias";

type Props = {
  personaId: string;
  activa: PestanaDeFicha;
  /**
   * Sin permiso de escritura no hay nada que administrar, así que la pestaña
   * no se pinta: una pestaña vacía es peor que su ausencia, y el aviso de
   * permiso de la página ya dice por qué.
   */
  puedeAdministrar: boolean;
};

export function PestanasDeFicha({
  personaId,
  activa,
  puedeAdministrar,
}: Props) {
  const pestanas: Pestana[] = [
    {
      clave: "residencias",
      etiqueta: "Residencias",
      href: `/padron/${personaId}`,
      activa: activa === "residencias",
    },
  ];

  if (puedeAdministrar) {
    pestanas.push({
      clave: "administrar",
      etiqueta: "Administrar",
      href: `/padron/${personaId}?pestana=administrar`,
      activa: activa === "administrar",
    });
  }

  return <Pestanas pestanas={pestanas} etiqueta="Secciones de la persona" />;
}
