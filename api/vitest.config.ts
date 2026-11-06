import { defineConfig } from "vitest/config";

/**
 * Configuracion de las pruebas.
 *
 * APP_ENV=test desactiva el limitador de intentos: las pruebas inician sesion
 * muchas veces desde la misma IP y el limite esta pensado para produccion.
 * Las pruebas corren contra job_itm_test (ver npm run test:prepare), una base
 * separada de la de desarrollo, por eso nunca ensucian los datos de la demo.
 */
export default defineConfig({
  test: {
    env: { APP_ENV: "test", DB_DATABASE: "job_itm_test" },
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
