require('dotenv').config();

const mysql = require('mysql2/promise');

const DB_NAME = process.env.DB_NAME || 'job_itm';

const connectionOptions = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(120) NOT NULL,
  correo VARCHAR(160) NOT NULL,
  rol ENUM('estudiante', 'empresa', 'vinculacion') NOT NULL DEFAULT 'estudiante',
  carrera VARCHAR(120) DEFAULT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_correo (correo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const SEED_USERS = [
  ['Joseline Ashley Llamas Garcia', 'ashley@itmexicali.edu.mx', 'estudiante', 'Ingeniería en Sistemas Computacionales', 1],
  ['Diego Alejandro Ruiz Mendez', 'diego@itmexicali.edu.mx', 'estudiante', 'Ingeniería en Sistemas Computacionales', 1],
  ['Maria Fernanda Valenzuela Soto', 'fernanda@itmexicali.edu.mx', 'estudiante', 'Ingeniería Industrial', 1],
  ['Carlos Eduardo Moreno Leyva', 'carlos@itmexicali.edu.mx', 'estudiante', 'Ingeniería Mecatrónica', 0],
  ['Tecnologías del Valle S.A. de C.V.', 'reclutamiento@tecvalle.mx', 'empresa', null, 1],
  ['Grupo Industrial Mexicali', 'talento@grupoim.mx', 'empresa', null, 1],
  ['Vinculación Estudiantil ITM', 'vinculacion@itmexicali.edu.mx', 'vinculacion', null, 1],
];

async function main() {
  console.log(`[seed] Conectando a MySQL en ${connectionOptions.host}:${connectionOptions.port} ...`);

  const root = await mysql.createConnection(connectionOptions);
  await root.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await root.end();

  const db = await mysql.createConnection({ ...connectionOptions, database: DB_NAME });
  await db.query(CREATE_TABLE);

  const [rows] = await db.query('SELECT COUNT(*) AS total FROM users');
  const total = rows[0].total;

  if (total > 0) {
    console.log(`[seed] La tabla users ya tiene ${total} registros. No se insertó nada.`);
  } else {
    await db.query('INSERT INTO users (nombre, correo, rol, carrera, activo) VALUES ?', [SEED_USERS]);
    console.log(`[seed] ${SEED_USERS.length} usuarios insertados en ${DB_NAME}.users`);
  }

  await db.end();
  console.log('[seed] Listo.');
}

main().catch((err) => {
  console.error('[seed] Error:', err.message);
  process.exit(1);
});
