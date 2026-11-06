/**
 * Catalogo institucional de carreras.
 *
 * El documento de diseno deja la lista definitiva como decision pendiente con la
 * contraparte (apartado 12.4). Se carga la oferta educativa vigente del
 * Tecnologico de Mexicali; ajustar nombres o claves es editar este archivo y
 * volver a correr `npm run seed`, sin tocar migraciones.
 */
import { db } from "../../support/database/connection";

interface CarreraSemilla {
  nombre: string;
  clave: string;
}

const CARRERAS: CarreraSemilla[] = [
  { nombre: "Ingenieria en Sistemas Computacionales", clave: "ISC" },
  { nombre: "Ingenieria Industrial", clave: "IIND" },
  { nombre: "Ingenieria Mecanica", clave: "IMEC" },
  { nombre: "Ingenieria Electrica", clave: "IELC" },
  { nombre: "Ingenieria Electronica", clave: "IELT" },
  { nombre: "Ingenieria en Gestion Empresarial", clave: "IGEM" },
  { nombre: "Ingenieria en Logistica", clave: "ILOG" },
  { nombre: "Ingenieria Quimica", clave: "IQ" },
  { nombre: "Ingenieria Bioquimica", clave: "IBQ" },
  { nombre: "Ingenieria en Materiales", clave: "IMAT" },
  { nombre: "Licenciatura en Administracion", clave: "LA" },
];

export async function sembrarCarreras(): Promise<void> {
  for (const carrera of CARRERAS) {
    const existente = await db("carreras").where({ nombre: carrera.nombre }).first();
    if (existente) {
      // Si ya existe solo se corrige la clave y se reactiva: nunca se borra,
      // porque estudiantes y vacantes la referencian.
      await db("carreras").where({ id: existente.id }).update({ clave: carrera.clave, activa: 1 });
      continue;
    }
    await db("carreras").insert({ nombre: carrera.nombre, clave: carrera.clave, activa: 1 });
  }

  console.log(`  carreras: ${CARRERAS.length} registradas`);
}
