/**
 * Usuarios de demostracion.
 *
 * Un usuario por cada rol, con la contrasena `demo1234`, para que la etapa E-1
 * se pueda verificar de inmediato: "un usuario de cada rol inicia sesion y
 * recibe el token correcto".
 *
 * El seeder es idempotente: si la cuenta ya existe no la duplica ni le cambia la
 * contrasena, de modo que se puede correr muchas veces sin miedo.
 *
 * Estas cuentas son solo para desarrollo. Antes de publicar hay que borrarlas o
 * cambiarles la contrasena.
 */
import { db } from "../../support/database/connection";
import { Hash } from "../../support/auth/hash";
import { asignarRol } from "../../support/authorization/gate";
import { Carrera } from "../../app/models/Carrera";

const CONTRASENA_DEMO = "demo1234";

interface CuentaDemo {
  nombre: string;
  correo: string;
  rol: "estudiante" | "empresa" | "vinculacion" | "admin_tecnico";
}

const CUENTAS: CuentaDemo[] = [
  { nombre: "Administrador Tecnico", correo: "admin@itmexicali.edu.mx", rol: "admin_tecnico" },
  { nombre: "Vinculacion Estudiantil", correo: "vinculacion@itmexicali.edu.mx", rol: "vinculacion" },
  { nombre: "Grupo Industrial del Valle", correo: "empresa@demo.com", rol: "empresa" },
  { nombre: "Alumno de Demostracion", correo: "alumno@itmexicali.edu.mx", rol: "estudiante" },
];

/** Crea la cuenta si no existe y devuelve su id. */
async function asegurarUsuario(cuenta: CuentaDemo): Promise<number> {
  const existente = await db("users").whereRaw("LOWER(correo) = ?", [cuenta.correo]).first();
  if (existente) return Number(existente.id);

  const [id] = await db("users").insert({
    nombre: cuenta.nombre,
    correo: cuenta.correo,
    contrasena: await Hash.hacer(CONTRASENA_DEMO),
    // Las cuentas de demostracion nacen verificadas para no bloquear las pruebas.
    correo_verificado_en: new Date(),
    estado: "activo",
  });

  return Number(id);
}

async function asegurarPerfilEstudiante(userId: number): Promise<void> {
  const existente = await db("estudiantes").where({ user_id: userId }).first();
  if (existente) return;

  const carrera = await Carrera.q().where({ clave: "ISC" }).first();
  if (!carrera) {
    console.warn("  estudiantes: no se encontro la carrera ISC; corre primero el seeder de carreras");
    return;
  }

  await db("estudiantes").insert({
    user_id: userId,
    matricula: "20300001",
    carrera_id: carrera.id,
    semestre: 8,
    telefono: "6861234567",
    habilidades: "JavaScript, TypeScript, Node.js, MySQL, React",
  });
}

async function asegurarPerfilEmpresa(userId: number): Promise<void> {
  const existente = await db("empresas").where({ user_id: userId }).first();
  if (existente) return;

  const validador = await db("users").where({ correo: "vinculacion@itmexicali.edu.mx" }).first();

  await db("empresas").insert({
    user_id: userId,
    razon_social: "Grupo Industrial del Valle",
    rfc: "GIV200101AB1",
    giro: "Manufactura",
    sitio_web: "https://ejemplo.com",
    telefono: "6861234567",
    contacto_nombre: "Laura Mendoza",
    contacto_correo: "rrhh@demo.com",
    // Aprobada desde el inicio para poder probar la publicacion de vacantes en E-2.
    estatus_validacion: "aprobada",
    validado_por: validador ? Number(validador.id) : null,
    validado_en: validador ? new Date() : null,
  });
}

export async function sembrarUsuariosDemo(): Promise<void> {
  for (const cuenta of CUENTAS) {
    const userId = await asegurarUsuario(cuenta);
    await asignarRol(userId, cuenta.rol);

    if (cuenta.rol === "estudiante") await asegurarPerfilEstudiante(userId);
    if (cuenta.rol === "empresa") await asegurarPerfilEmpresa(userId);

    console.log(`  usuario: ${cuenta.correo.padEnd(34)} rol ${cuenta.rol}`);
  }

  console.log(`  contrasena de las cuentas demo: ${CONTRASENA_DEMO}`);
}
