import type { ClaveMostrada } from "./claveMostrada";
import { DescartarClaveAlMostrar } from "./DescartarClaveAlMostrar";
import { TarjetaDeClave, type UsuarioDeLaClave } from "./TarjetaDeClave";

/**
 * La contrasenia temporal, la unica vez que se muestra (S4 y S9 a S11 de
 * `usuarios-ux`), cuando el servidor la tiene en la mano: la navegacion de
 * documento, que es el camino sin JavaScript. La tarjeta la pinta
 * `TarjetaDeClave` y el token sale de la URL al pintarse.
 *
 * Con JavaScript la pantalla no recibe la clave —viajaria en el payload que
 * el router restaura al volver con «Atras» (S4 de `usuarios-seguridad`)—:
 * recibe el token y la pide la isla `ClaveTemporalAlMostrar`.
 */

export type { UsuarioDeLaClave } from "./TarjetaDeClave";

export function AvisoDeClaveTemporal({
  mostrada,
  usuario,
}: {
  mostrada: ClaveMostrada;
  usuario: UsuarioDeLaClave;
}) {
  return (
    <>
      <TarjetaDeClave
        motivo={mostrada.motivo}
        usuario={usuario}
        token={mostrada.token}
        clave={mostrada.clave}
      />
      <DescartarClaveAlMostrar />
    </>
  );
}
