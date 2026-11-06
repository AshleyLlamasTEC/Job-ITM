# Criterios de aceptacion - Job ITM (tabla 38 del diseno)

Medidas en el equipo de desarrollo (Windows 11, Node 22, MySQL 8 en local) sobre
la base `job_itm_test`. El software final solo puede declararse "cumplido en
produccion" con una corrida adicional en el servidor del ITM; los estados que
de mi parte y de la alumna verifican con este mismo procedimiento son
marcados aqui.

## CA-01 · Toda la informacion cabe en las 14 tablas definidas
**Cumplido.** `tests/aceptacion.test.ts` comprueba que las 14 tablas de negocio
y las 2 de infraestructura (`personal_access_tokens`, `bitacora`) existen y que
los indices documentados estan presentes (`users_correo_unique`,
`vacantes_empresa_id_estado_index`, `vacantes_busqueda_fulltext`).

## CA-02 · Cada requerimiento funcional tiene al menos una ruta
**Cumplido.** Cruce de RF-01..RF-12 con el catalogo de rutas; el scheduler
`npm run schedule:run` cubre RF-12 (expiracion de vacantes).

## CA-03 · Cada permiso corresponde a una accion real y tiene un rol
**Cumplido.** Todos los permisos de la matriz aparecen en la capa de rutas.
Los roles `estudiante`, `empresa`, `vinculacion` tienen permisos; `admin_tecnico`
recibe acceso total por regla global. `usuarios.gestionar` y `bitacora.ver`
solo los tiene `admin_tecnico` (documentado en el README).

## CA-04 · Un visitante recorre el buscador y el detalle sin iniciar sesion
**Cumplido.** `GET /vacantes`, `GET /catalogos/*` y `GET /vacantes/{id}` responden 200 sin token; las rutas de sesion responden 401.

## CA-05 · Una empresa sin validar no puede publicar ni enviar a revision
**Cumplido.** Registro pendiente → `POST /empresa/vacantes` responde 403 y la base no registra la vacante.

## CA-06 · Un estudiante no puede postularse dos veces a la misma vacante
**Cumplido.** Segundo intento: 422 con `errors.vacante_id`; la base registra 1 fila.

## CA-07 · Nadie accede a recursos de otra empresa ni de otro estudiante
**Cumplido.** 404 para candidatura ajena y para marcas ajenas; 403 en panel empresa para estudiantes.

## CA-08 · El buscador combina al menos cuatro filtros correctamente
**Cumplido.** Comparacion API vs consulta directa con `tipo + modalidad + ciudad + salario_min`: los IDs coinciden.

## CA-09 · Una vacante vencida deja de aparecer
**Cumplido.** La tarea programada (`vacantes:expirar`) la marca `expirada`; el detalle responde 404.

## CA-10 · El curriculum solo lo descargan el alumno, la empresa destinataria y Vinculacion
**Cumplido.** Los tres roles descargan 200 `application/pdf`; un otro estudiante responde 403 (rutas empresa/admin) o 404 (su CV aun no cargado); enlace con firma alterada → 403.

## CA-11 · Veinte pantallas con prototipo
**Pendiente de la alumna / prototipo.** El anexo A del diseno lo lista como
"pendiente". La validacion exige el frontend construido y los 20 prototipos.

Ruta: `/auth/login`, `/inicio`, `/registro`, `/mis-postulaciones`, etc. (ver 6.3
del diseno). Frontend en Node/React aun no implementado.

## CA-12 · Menos de dos segundos con 1000 vacantes publicadas
**Cumplido en este equipo** (nota: no es el servidor de produccion).
Corre con `npm run bench` (crea 1000 filas sinteticas, mide, borra):

| Metrica | Tiempo |
|---|---|
| Buscador recientes, pagina 1 | 22 ms |
| Fulltext | 10 ms |
| Buscador + 4 filtros combinados | 10 ms |

## Resumen

| Criterio | Estado |
|---|---|
| CA-01 tablas | Cumplido (test) |
| CA-02 RF → rutas | Cumplido (test) |
| CA-03 Permisos reales | Cumplido (test) |
| CA-04 Visitante | Cumplido (test) |
| CA-05 Empresa pendiente | Cumplido (test) |
| CA-06 Duplicado 422 | Cumplido (test) |
| CA-07 Recurso ajeno 404 | Cumplido (test) |
| CA-08 Filtros combinados | Cumplido (test) |
| CA-09 Expira | Cumplido (test) |
| CA-10 Curriculum por rol | Cumplido (test) |
| CA-11 Pantallas prototipadas | Pendiente (anexo A) |
| CA-12 Rendimiento | Cumplido (bench) |

Fuera de cuantos criterios se cumplen con las pruebas automatizadas (45/45 en
`aceptacion.test.ts`), las pruebas totales pasan 148/148.

## Nota sobre produccion

Cuando el servidor del ITM ejecute el despliegue (ver `Manual_de_instalacion.md`),
deben repetirse estos pasos: `npm ci`, `npm run migrate`, `npm run seed`,
`npm run schedule:run`, `npm run backup`, `npm run backup -- --restaurar=...`,
`npm test`, `npm run bench`. Solo entonces se marca "en produccion".
