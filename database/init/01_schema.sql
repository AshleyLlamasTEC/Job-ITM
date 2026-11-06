USE job_itm;

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

INSERT INTO users (nombre, correo, rol, carrera, activo) VALUES
  ('Joseline Ashley Llamas Garcia', 'ashley@itmexicali.edu.mx', 'estudiante', 'Ingeniería en Sistemas Computacionales', 1),
  ('Diego Alejandro Ruiz Mendez', 'diego@itmexicali.edu.mx', 'estudiante', 'Ingeniería en Sistemas Computacionales', 1),
  ('Maria Fernanda Valenzuela Soto', 'fernanda@itmexicali.edu.mx', 'estudiante', 'Ingeniería Industrial', 1),
  ('Carlos Eduardo Moreno Leyva', 'carlos@itmexicali.edu.mx', 'estudiante', 'Ingeniería Mecatrónica', 0),
  ('Tecnologías del Valle S.A. de C.V.', 'reclutamiento@tecvalle.mx', 'empresa', NULL, 1),
  ('Grupo Industrial Mexicali', 'talento@grupoim.mx', 'empresa', NULL, 1),
  ('Vinculación Estudiantil ITM', 'vinculacion@itmexicali.edu.mx', 'vinculacion', NULL, 1);
