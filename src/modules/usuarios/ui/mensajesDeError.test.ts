import { describe, expect, it } from "vitest";
import {
  CODIGOS_DE_ERROR,
  esCodigoDeError,
  mensajeDeError,
} from "./mensajesDeError";

/**
 * A4 de la verificacion de T1: la URL lleva un **codigo**, no el texto.
 *
 * `?error=` lo escribe cualquiera en la barra de direcciones, y pintarlo
 * tal cual es reflejar texto ajeno en la pantalla del municipio. La lista es
 * cerrada y el mensaje vive del lado del servidor, con el vocabulario de
 * `AGENTS.md` para la operadora.
 */

describe("mensajeDeError", () => {
  it.each([
    ["formulario", "Faltan el nombre o el correo."],
    ["sin-rol", "Elija un rol."],
    ["sin-destinatario", "Falta la persona."],
    ["sin-permiso", "No tiene permiso para esta operación."],
    ["no-encontrado", "El recurso no existe."],
    [
      "rol-no-asignable",
      "Desde el panel solo se dan de alta operadores y consultas.",
    ],
    [
      "correo-ya-registrado",
      "Ya hay una persona con ese correo en este ayuntamiento.",
    ],
    ["generico-alta", "No se pudo completar el alta. Intente de nuevo."],
    [
      "generico-restablecimiento",
      "No se pudo restablecer la contraseña. Intente de nuevo.",
    ],
    ["generico-baja", "No se pudo dar de baja a la persona. Intente de nuevo."],
  ])("traduce %s al mensaje de la operadora", (codigo, mensaje) => {
    expect(mensajeDeError(codigo)).toBe(mensaje);
  });

  it.each([["cualquier-cosa"], ["<script>alert(1)</script>"], [""]])(
    "lo que no es un codigo no muestra nada: %s",
    (valor) => {
      expect(mensajeDeError(valor)).toBeNull();
      expect(esCodigoDeError(valor)).toBe(false);
    },
  );

  it("sin parametro en la URL no hay mensaje", () => {
    expect(mensajeDeError(undefined)).toBeNull();
    expect(mensajeDeError(["formulario", "formulario"])).toBeNull();
  });

  it("todo codigo declarado tiene su mensaje", () => {
    for (const codigo of CODIGOS_DE_ERROR) {
      expect(mensajeDeError(codigo)).toBeTruthy();
    }
  });
});
