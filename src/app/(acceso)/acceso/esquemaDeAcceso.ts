import { z } from "zod";
import { LARGO_MINIMO } from "@/shared/auth/reglasDeClave";

export const esquemaDeAcceso = z.object({
  email: z.email("Revise el correo."),
  password: z.string().min(LARGO_MINIMO, "La contraseña es demasiado corta."),
});

export type CamposDeAcceso = z.infer<typeof esquemaDeAcceso>;
