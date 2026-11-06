/**
 * Tareas programadas.
 *
 * Equivalente al scheduler de Laravel (`Kernel::schedule`). No hay demonio
 * propio: el sistema operativo llama a `npm run schedule:run` cada cierto tiempo
 * (cron en Linux, Programador de tareas en Windows) y este archivo ejecuta lo
 * que corresponda en esa pasada.
 *
 * En E-1 solo existe la expiracion de vacantes; las demas tareas se agregan en
 * las etapas siguientes.
 */
import { db } from "../support/database/connection";

interface Tarea {
  nombre: string;
  descripcion: string;
  ejecutar: () => Promise<string>;
}

/**
 * Una vacante publicada deja de ser visible cuando su fecha de cierre ya paso.
 * Se marca como expirada en lugar de borrarla, para conservar el historial de
 * postulaciones y los indicadores.
 */
async function expirarVacantes(): Promise<string> {
  const afectadas = await db("vacantes")
    .where({ estado: "publicada" })
    .where("fecha_cierre", "<", new Date().toISOString().slice(0, 10))
    .update({ estado: "expirada", actualizado_en: new Date() });

  return `${afectadas} vacante(s) marcadas como expiradas`;
}

const TAREAS: Tarea[] = [
  {
    nombre: "vacantes:expirar",
    descripcion: "Marca como expiradas las vacantes publicadas cuya fecha de cierre ya paso.",
    ejecutar: expirarVacantes,
  },
];

/** Ejecuta todas las tareas de la pasada. */
export async function ejecutarTareas(): Promise<void> {
  for (const tarea of TAREAS) {
    const inicio = Date.now();
    try {
      const resultado = await tarea.ejecutar();
      console.log(`  ${tarea.nombre}: ${resultado} (${Date.now() - inicio} ms)`);
    } catch (error) {
      // Una tarea que falla no debe impedir las demas.
      console.error(`  ${tarea.nombre}: fallo -> ${(error as Error).message}`);
      process.exitCode = 1;
    }
  }
}

/** Lista las tareas registradas, para `--list`. */
export function listarTareas(): Array<Pick<Tarea, "nombre" | "descripcion">> {
  return TAREAS.map(({ nombre, descripcion }) => ({ nombre, descripcion }));
}
