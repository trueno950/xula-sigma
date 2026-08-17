"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { LARGO_MINIMO } from "@/shared/auth/reglasDeClave";

/**
 * El formulario de acceso. Es la hoja: lo unico `"use client"` de la
 * pantalla.
 *
 * **Habla con `/api/auth/sign-in/email`, no con una Server Action**, y esa
 * es una decision. La ruta es la superficie con limitacion de ritmo
 * (`route.ts`); una Server Action seria una segunda puerta al acceso que
 * habria que acordarse de limitar tambien, y el dia que alguien se olvide
 * no falla nada — simplemente deja de haber limite. Una sola puerta.
 *
 * La cookie la pone Better Auth en la respuesta, acotada al subdominio del
 * municipio. Sin `crossSubDomainCookies`: la de Motul no llega a Ticul.
 */

const esquema = z.object({
  email: z.email("Revise el correo."),
  password: z.string().min(LARGO_MINIMO, "La contrasenia es mas larga."),
});

type Campos = z.infer<typeof esquema>;

/**
 * Un solo mensaje para todos los rechazos.
 *
 * Distinguir "no existe" de "contrasenia incorrecta" confirma que la cuenta
 * existe, y con eso se enumera quien trabaja en el municipio. Los cuatro
 * caminos de rechazo —inexistente, clave incorrecta, dado de baja, otro
 * municipio— dicen lo mismo.
 */
const CREDENCIALES_INVALIDAS = "Correo o contrasenia incorrectos.";

export function FormularioDeAcceso() {
  const [fallo, setFallo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Campos>({ resolver: zodResolver(esquema) });

  const acceder = async (campos: Campos) => {
    setFallo(null);

    const respuesta = await fetch("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(campos),
    });

    if (respuesta.ok) {
      // Recarga entera y no `router.push`: la sesion la lee el servidor de
      // la cookie, y una navegacion de cliente no la vuelve a pedir.
      window.location.assign("/");
      return;
    }

    setFallo(
      respuesta.status === 429
        ? "Demasiados intentos. Espere unos minutos."
        : CREDENCIALES_INVALIDAS,
    );
  };

  return (
    <form
      onSubmit={handleSubmit(acceder)}
      className="flex flex-col gap-4"
      noValidate
    >
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-neutral-800">Correo</span>
        <input
          {...register("email")}
          type="email"
          autoComplete="username"
          className="rounded border border-neutral-300 px-3 py-2 outline-none focus:border-marca"
        />
        {errors.email ? (
          <span className="text-sm text-red-700">{errors.email.message}</span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-neutral-800">
          Contrasenia
        </span>
        <input
          {...register("password")}
          type="password"
          autoComplete="current-password"
          className="rounded border border-neutral-300 px-3 py-2 outline-none focus:border-marca"
        />
        {errors.password ? (
          <span className="text-sm text-red-700">
            {errors.password.message}
          </span>
        ) : null}
      </label>

      {fallo ? (
        <p role="alert" className="text-sm text-red-700">
          {fallo}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-marca px-4 py-2 font-medium text-marca-texto disabled:opacity-60"
      >
        {isSubmitting ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
