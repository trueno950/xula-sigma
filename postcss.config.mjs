/**
 * Tailwind 4 no usa `tailwind.config.js`: la configuracion vive en el CSS,
 * con `@theme`. Este archivo es todo lo que necesita el bundler.
 */
export default {
  plugins: { "@tailwindcss/postcss": {} },
};
