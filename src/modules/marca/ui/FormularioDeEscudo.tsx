"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { ANILLO_DE_FOCO } from "@/shared/ui/estilos";
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
      className="flex flex-col gap-4"
      noValidate
    >
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-neutral-800">
          Escudo del ayuntamiento
        </span>
        <input
          {...register("escudo", { required: "Elija un archivo PNG." })}
          type="file"
          accept="image/png"
          className={`rounded border border-neutral-300 px-3 py-2 ${ANILLO_DE_FOCO}`}
        />
        {errors.escudo ? (
          <span className="text-sm text-red-700">{errors.escudo.message}</span>
        ) : null}
      </label>

      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {exito ? (
        <p role="status" className="text-sm text-green-700">
          Escudo actualizado.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-marca px-4 py-2 font-medium text-marca-texto disabled:opacity-60"
      >
        {isSubmitting ? "Subiendo..." : "Guardar escudo"}
      </button>
    </form>
  );
}
