"use client";

import { useEffect, useState } from "react";
import type { UsuarioDelPanel } from "../domain";
import { ClaveQueYaNoSePuedeMostrar } from "./ClaveQueYaNoSePuedeMostrar";
import type { ClaveEntregada } from "./claveMostrada";
import { DescartarClaveAlMostrar } from "./DescartarClaveAlMostrar";
import { pedirLaClave } from "./pedirLaClave";
import { TarjetaDeClave } from "./TarjetaDeClave";

/**
 * La isla que pide la contrasenia temporal cuando la pantalla no la puede
 * llevar adentro (S4 de `usuarios-seguridad`): la deja en el estado del
 * componente y se la pide al Route Handler una sola vez, que la entrega y
 * borra la cookie en el mismo viaje.
 *
 * **Por que no viaja en el payload.** El router de Next guarda el payload de
 * la ruta y lo vuelve a pintar al volver con «Atras» (glosario de Next 16.3.1,
 * «Client Cache»: «Pages are not cached by default but are reused during
 * browser back/forward navigation»): con la clave adentro, salir de la
 * pantalla sin pulsar «Ya la anoté» y volver la mostraria otra vez sin
 * pedirle nada al servidor. Con esto, volver la obliga a pedirla, y como la
 * cookie ya no existe encuentra el mismo estado «ya no se puede mostrar» que
 * la recarga sin JavaScript (S11 de `usuarios-ux`), con el boton de
 * restablecer si los permisos lo dejan.
 *
 * Sin JavaScript no hay isla: el servidor pinta la tarjeta entera
 * (`AvisoDeClaveTemporal`) y el proxy borra la cookie en esa misma respuesta.
 */

type Estado =
  | { tipo: "pidiendo" }
  | { tipo: "entregada"; entregada: ClaveEntregada }
  | { tipo: "ya-no" };

export function ClaveTemporalAlMostrar({
  token,
  usuario,
  puedeRestablecer,
}: {
  token: string;
  usuario: UsuarioDelPanel;
  puedeRestablecer: boolean;
}) {
  const [estado, setEstado] = useState<Estado>({ tipo: "pidiendo" });

  useEffect(() => {
    let isVigente = true;

    const pedir = async () => {
      const entregada = await pedirLaClave(token);
      if (!isVigente) return;

      setEstado(
        entregada ? { tipo: "entregada", entregada } : { tipo: "ya-no" },
      );
    };

    void pedir();

    return () => {
      isVigente = false;
    };
  }, [token]);

  return (
    <>
      <DescartarClaveAlMostrar />
      {estado.tipo === "pidiendo" ? null : estado.tipo === "ya-no" ? (
        <ClaveQueYaNoSePuedeMostrar
          usuario={usuario}
          puedeRestablecer={puedeRestablecer}
        />
      ) : (
        <TarjetaDeClave
          motivo={estado.entregada.motivo}
          usuario={usuario}
          token={token}
          clave={estado.entregada.clave}
        />
      )}
    </>
  );
}
