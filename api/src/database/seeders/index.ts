/**
 * Orquestador de seeders.
 *
 *   npm run seed                        datos minimos, en orden
 *   npm run seed:demo                   ademas carga datos de demostracion
 *   npm run artisan -- db:seed --class=carreras
 *
 * El orden importa: los roles y permisos primero (de ellos dependen las
 * cuentas), despues el catalogo de carreras y al final los usuarios demo, que
 * referencian carreras.
 *
 * `demo` existe pero no entra en la corrida normal: llena la base de vacantes y
 * candidaturas para probar el sistema con volumen, y no debe ejecutarse en una
 * instalacion real.
 */
import { sembrarCarreras } from "./carreras";
import { sembrarDemo } from "./demo";
import { sembrarRolesYPermisos } from "./permisos";
import { sembrarUsuariosDemo } from "./usuarios";

type Semilla = () => Promise<void>;

const SEMILLAS: Record<string, Semilla> = {
  permisos: sembrarRolesYPermisos,
  carreras: sembrarCarreras,
  usuarios: sembrarUsuariosDemo,
  demo: sembrarDemo,
};

/** Semillas que corren con `npm run seed`, en este orden. */
const ORDEN_NORMAL = ["permisos", "carreras", "usuarios"];

/** Ejecuta las semillas normales, o solo la indicada en `--class`. */
export async function sembrar(clase?: string): Promise<void> {
  if (clase) {
    const semilla = SEMILLAS[clase];
    if (!semilla) {
      throw new Error(
        `La semilla "${clase}" no existe. Disponibles: ${Object.keys(SEMILLAS).join(", ")}`,
      );
    }
    await semilla();
    return;
  }

  for (const nombre of ORDEN_NORMAL) {
    console.log(`  [${nombre}]`);
    await SEMILLAS[nombre]();
  }
}
