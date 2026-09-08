import { describe, expect, it } from "vitest";
import { ROLES } from "@/shared/auth/roles";
import type { AccionDeNodo } from "./PanelDeNodo";
import { permisosDeTerritorio, puedeAbrir } from "./permisos";

/**
 * Que la pantalla ofrezca exactamente lo que el caso de uso acepta.
 *
 * Antes de esta tabla la pagina calculaba
 * `puedeEscribir(rol) || puedeAdministrarTerritorio(rol)` y pasaba ese
 * unico booleano a las cuatro pestanas. Como `puedeEscribir` es
 * `rol !== "CONSULTA"`, el `||` era codigo muerto: cualquiera que pudiera
 * escribir veia tambien las acciones de estructura. Un OPERADOR abria
 * "Agregar calle", llenaba el formulario y recibia `NoAutorizadoError` al
 * enviar.
 *
 * Esconder un boton no es autorizacion -la guarda real la hace cada caso
 * de uso, `05-seguridad.md` seccion 6-, pero ofrecer un camino que termina
 * en un error tampoco es una pantalla.
 */
const ADMINISTRAR: readonly AccionDeNodo[] = [
  "calle",
  "ubicarCalle",
  "reparentearCalle",
  "bajaCalle",
  "renombrarCalle",
  "reparentear",
];

const ESCRIBIR: readonly AccionDeNodo[] = [
  "lugar",
  "domicilio",
  "renombrar",
  "baja",
];

describe("permisos de territorio", () => {
  it.each(ADMINISTRAR)(
    "%s solo se ofrece a quien administra el territorio",
    (accion) => {
      expect(puedeAbrir(accion, permisosDeTerritorio("ADMIN_MUNICIPAL"))).toBe(
        true,
      );
      expect(puedeAbrir(accion, permisosDeTerritorio("OPERADOR"))).toBe(false);
    },
  );

  it.each(ESCRIBIR)("%s se ofrece a quien escribe", (accion) => {
    expect(puedeAbrir(accion, permisosDeTerritorio("ADMIN_MUNICIPAL"))).toBe(
      true,
    );
    expect(puedeAbrir(accion, permisosDeTerritorio("OPERADOR"))).toBe(true);
  });

  it.each([...ADMINISTRAR, ...ESCRIBIR])(
    "%s no se le ofrece a CONSULTA",
    (accion) => {
      expect(puedeAbrir(accion, permisosDeTerritorio("CONSULTA"))).toBe(false);
    },
  );

  /**
   * Sin esto, agregar una accion nueva a `AccionDeNodo` y olvidarse de
   * clasificarla pasaria en verde: las tablas de arriba solo miran las que
   * alguien se acordo de escribir.
   */
  it("las dos listas cubren toda accion de nodo", () => {
    const clasificadas = [...ADMINISTRAR, ...ESCRIBIR].sort();
    const declaradas = Object.keys(
      permisosDeTerritorio("ADMIN_MUNICIPAL").porAccion,
    ).sort();

    expect(clasificadas).toEqual(declaradas);
  });

  it("la pestana Editar se esconde solo cuando no hay nada que abrir", () => {
    expect(permisosDeTerritorio("OPERADOR").abreLaEdicion).toBe(true);
    expect(permisosDeTerritorio("CONSULTA").abreLaEdicion).toBe(false);
  });

  it("ningun rol de la plataforma rompe la tabla", () => {
    for (const rol of ROLES) {
      expect(() => permisosDeTerritorio(rol)).not.toThrow();
    }
  });
});
