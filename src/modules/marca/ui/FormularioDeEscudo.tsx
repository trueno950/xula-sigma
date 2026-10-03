"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Aviso } from "@/shared/ui/Aviso";
import { BarraDeAcciones } from "@/shared/ui/BarraDeAcciones";
import { Boton } from "@/shared/ui/Boton";
import { MensajeDeError } from "@/shared/ui/Campo";
import {
  ANILLO_DE_FOCO,
  CLASES_DE_ETIQUETA,
  CLASES_DE_FORMULARIO,
} from "@/shared/ui/estilos";
import { cambiarEscudoAction } from "./actions/cambiarEscudo.action";
import { subirEscudo } from "./subirEscudo";

/**
 * El formulario de escudo. Es la hoja: lo unico `"use client"` de la
 * pantalla, igual que `FormularioDeAcceso`.
 *
 * Arma el `FormData` a mano en el `onSubmit` en vez de usar la `action`
 * nativa del `<form>`: la nativa no deja leer el `ActionResult` para
 * pintar el error por campo, que es justo lo que este formulario necesita.
 */

type Campos = {
  escudo: FileList;
};

export function FormularioDeEscudo() {
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Campos>();

  const subir = async ({ escudo }: Campos) => {
    setError(null);
    setExito(false);

    const archivo = escudo.item(0);

    if (!archivo) return;

    const resultado = await subirEscudo(archivo, cambiarEscudoAction);

    if (!resultado.ok) {
      setError(resultado.mensaje);
      return;
    }

    setExito(true);
  };

  return (
    <form
      onSubmit={handleSubmit(subir)}
      className={CLASES_DE_FORMULARIO}
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="escudo-archivo" className={CLASES_DE_ETIQUETA}>
          Escudo del ayuntamiento
        </label>
        <input
          id="escudo-archivo"
          {...register("escudo", { required: "Elija un archivo PNG." })}
          type="file"
          accept="image/png"
          aria-invalid={errors.escudo ? true : undefined}
          aria-describedby={errors.escudo ? "escudo-error" : undefined}
          className={`w-full rounded-md border bg-caliza-lienzo px-3 py-2 text-[15px] text-caliza-tinta transition-[border-color] duration-150 ease-salida file:mr-3 file:rounded-sm file:border-0 file:bg-caliza-relleno file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-caliza-tinta ${
            errors.escudo ? "border-senial-error" : "border-caliza-borde"
          } ${ANILLO_DE_FOCO}`}
        />
        {errors.escudo ? (
          <MensajeDeError
            id="escudo-error"
            texto={errors.escudo.message ?? ""}
          />
        ) : null}
      </div>

      {error ? <Aviso tono="error">{error}</Aviso> : null}

      {exito ? <Aviso tono="exito">Escudo actualizado.</Aviso> : null}

      <BarraDeAcciones>
        <Boton type="submit" variante="primaria" disabled={isSubmitting}>
          {isSubmitting ? "Subiendo..." : "Guardar escudo"}
        </Boton>
      </BarraDeAcciones>
    </form>
  );
}
