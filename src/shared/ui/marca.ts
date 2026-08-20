import type { CSSProperties } from "react";
import type { Marca } from "@/shared/marca";

/**
 * Las variables CSS que consume `globals.css`, para el `style` del layout.
 *
 * **En el servidor y nunca en el cliente.** Aplicadas despues de hidratar,
 * el municipio ve medio segundo la marca por defecto y despues cambia.
 *
 * La validacion de `marca` —`validarMarca`, `leerMarca`, el esquema de
 * colores— vive en `@/shared/marca`, no aca: es una regla de negocio, y
 * este archivo se queda solo con lo que de verdad es presentacion, la
 * traduccion de una `Marca` ya validada a `CSSProperties`.
 */
export const variablesDeMarca = (marca: Marca): CSSProperties =>
  ({
    ...(marca.primario ? { "--primary": marca.primario } : {}),
    ...(marca.primarioTexto
      ? { "--primary-foreground": marca.primarioTexto }
      : {}),
    ...(marca.secundario ? { "--accent": marca.secundario } : {}),
  }) as CSSProperties;
