# Job ITM

Bolsa de trabajo del Tecnologico de Mexicali. Practica de **Programacion Web**.

Implementacion de la fase de construccion del documento
`Diseno_Fase2_Bolsa_de_Trabajo_TecMexicali.docx`, en seis etapas (apartado 12.1):

| Etapa | Que se construye | Estado |
| ----- | ---------------- | ------ |
| E-1 | Entorno, migraciones, autenticacion y roles | Terminada |
| E-2 | Perfiles, catalogos, alta de vacantes y buscador | Terminada |
| E-3 | Panel de la empresa y estados de la vacante | Terminada en el backend; falta la interfaz |
| E-4 | Postulaciones, candidatos y notificaciones | Terminada |
| E-5 | Panel de Vinculacion, reportes e indicadores | Terminada |
| E-6 | Pruebas de aceptacion, despliegue y manuales | En curso (criterios verificados; falta produccion) |

E-3 no se construyo como etapa aparte porque su backend (tablero, perfil de la
empresa, logo, formulario estandarizado y ciclo de estados de la vacante) quedo
resuelto al hacer E-2. Lo que falta de E-3 es la pantalla, y eso corresponde al
frontend.

## Stack

**Backend**
- **Node.js 22** con **TypeScript** y **Express 5**. No hay PHP ni Laravel.
- **MySQL 8** mediante **Knex** como query builder.

**Frontend**
- **React 19** con **TypeScript** y **Vite 6**.
- **Tailwind CSS 3.4** + **shadcn/ui** (componentes copiados, no CLI).
- **React Router 7**, **sonner** (toasts), **lucide-react** (iconos).

## Arquitectura

El proyecto es un **monorepo** con dos aplicaciones independientes que se
comunican por HTTP (API REST). La raiz declara ambos como workspaces de npm
(`"workspaces": ["api", "web"]`), por eso existen `api/node_modules` y
`web/node_modules` ademas del de la raiz: npm eleva las dependencias comunes y
deja las especificas de cada lado en su carpeta.

```
Job ITM/
├── api/          → Backend (Node.js + Express 5 + MySQL 8)
├── web/          → Frontend (React + Vite + Tailwind + shadcn)
├── database/     → Script SQL de inicializacion
├── manuales/     → Manuales de instalacion, usuario y criterios de aceptacion
└── package.json  → Orquesta ambos proyectos con npm workspaces
```

La idea central del backend es que el proyecto se lea como un proyecto de
Laravel aunque este escrito en Node. La correspondencia es directa:

| Laravel | Aqui |
| ------- | ---- |
| `database/migrations` | `api/src/database/migrations` |
| `Schema::create` y `$table->foreignId()->constrained()` | `schema.create` y `t.foreignId().constrained()` |
| `routes/api.php` | `api/src/routes/api.ts` |
| `app/Http/Controllers` | `api/src/app/controllers` |
| `app/Models` | `api/src/app/models` |
| `app/Http/Middleware` | `api/src/app/middleware` |
| `bootstrap/app.php` | `api/src/bootstrap/app.ts` |
| `php artisan` | `npm run artisan --` |
| `auth:sanctum` | `autenticar` |
| `can:vacantes.moderar` | `autorizar("vacantes.moderar")` |
| `Gate::before` | regla global de `admin_tecnico` en `support/authorization/gate.ts` |

### Estructura del backend (`api/src/`)

```
api/src/
├── app/
│   ├── controllers/     traducen HTTP a llamadas de servicio
│   ├── services/        reglas de negocio (Vacantes, Postulaciones, Perfiles, Vinculacion)
│   ├── models/          tabla, llaves, ocultos y conversiones
│   └── middleware/      autenticar, autorizar, manejarErrores, subirArchivo
├── routes/              api.ts + modulos por apartado del capitulo 5
├── support/             utilidades transversales
│   ├── auth/            hash bcrypt, tokens Sanctum, enlaces firmados
│   ├── authorization/   roles y permisos (spatie)
│   ├── database/        conexion a MySQL (Knex)
│   ├── http/            errores, respuestas, lectura de la peticion
│   ├── validation/      reglas al estilo Laravel
│   └── model.ts         modelo base
├── config/              lectura tipada de .env
├── console/             tareas programadas
├── database/
│   ├── migrations/      16 migraciones
│   └── seeders/         roles, permisos, carreras, cuentas demo
├── bootstrap/app.ts     middleware global, rutas, errores
└── server.ts            arranque y apagado ordenado
```

### Estructura del frontend (`web/src/`)

```
web/src/
├── components/
│   ├── ui/          componentes shadcn/ui (Button, Input, Dialog, Tabs, etc.)
│   ├── layout/      Navbar, Footer, PublicLayout, UserLayout (sidebar por rol)
│   ├── comunes/     Aviso, CampoError, EstadoVacio
│   ├── home/        HeroSlider, BuscadorRapido
│   └── vacantes/    VacanteCard
├── pages/
│   ├── Home.tsx, Login.tsx, Registro.tsx, Buscador.tsx, VacanteDetalle.tsx
│   └── cuenta/      panel del usuario (Resumen, Perfil, Postulaciones, Favoritos, Notificaciones)
│       ├── admin/   Usuarios, moderacion, empresas, reportes
│       └── empresa/ Mis vacantes, candidatos
├── context/         AuthProvider (sesion, login, permisos)
├── hooks/           useSinLeer (contador de notificaciones)
└── lib/             api.ts (cliente HTTP), tipos.ts, formato.ts, utils.ts
```

El frontend consume la API con un cliente tipado (`lib/api.ts`) que traduce la
envoltura `{ data, meta }` y los errores 422 a promesas con detalle por campo,
para pintarlos debajo de cada input.

### Como se comunica frontend con backend

```
React (localhost:5173)  --fetch-->  Express (localhost:3000/api/v1)  -->  MySQL 8
        ^                                          |
        |                                          v
        +---- { data, meta } / 422 { errors } ----+
```

El token se guarda en `localStorage` y se envia como `Authorization: Bearer`.
La API responde con `Cache-Control: no-store` para evitar respuestas 304 sin
cuerpo.

## Requisitos

- Node.js 22 o superior
- MySQL 8 en `127.0.0.1:3306`

## Arranque

```bash
# 1. Dependencias (raiz, api y web)
npm install

# 2. Configuracion: copiar api/.env.example a api/.env y ajustar credenciales
#    de MySQL. En Windows:
copy api\.env.example api\.env

# 3. Clave de la aplicacion (firma los enlaces de correo)
npm run artisan -- key:generate

# 4. Esquema y datos iniciales
npm run migrate
npm run seed

# 5. Servidor backend (localhost:3000)
npm run dev

# 6. Frontend en otra terminal (localhost:5173)
npm run dev:web
```

La API queda en `http://localhost:3000/api/v1` y la comprobacion de salud en
`http://localhost:3000/salud`. El frontend en `http://localhost:5173`.

## Comandos

| Comando | Que hace |
| ------- | -------- |
| `npm run dev` | Servidor backend con recarga automatica |
| `npm run dev:web` | Frontend Vite (localhost:5173) |
| `npm run build:web` | Compila el frontend para produccion |
| `npm run migrate` | Aplica las migraciones pendientes |
| `npm run migrate:status` | Muestra que migraciones estan aplicadas |
| `npm run migrate:rollback` | Revierte el ultimo lote |
| `npm run migrate:fresh` | Borra el esquema y migra desde cero |
| `npm run seed` | Carga roles, permisos, carreras y cuentas demo |
| `npm run seed:demo` | Ademas, carga datos de demostracion (no en produccion) |
| `npm run test:prepare` | Crea y siembra `job_itm_test`, la base exclusiva de las pruebas |
| `npm run db:reset` | `migrate:fresh` + `seed` |
| `npm run typecheck` | Revisa los tipos del backend sin generar archivos |
| `npm run typecheck -w @job-itm/web` | Revisa los tipos del frontend |
| `npm test` | Pruebas automatizadas (reconstruye `job_itm_test` antes de correr) |
| `npm run bench` | Bench CA-12: 1000 vacantes sinteticas, mide, borra |
| `npm run backup` | Respaldo diario (base + storage), 7 dias de retencion |
| `npm run artisan -- list` | Lista los comandos de consola |

## Manuales y criterios de aceptacion

Los entregables escritos de E-6 viven en `manuales/`:

- `manuales/Manual_de_instalacion.md` — requisitos, `.env`, migraciones,
  tareas programadas, respaldo y restauracion, publicacion.
- `manuales/Manual_de_usuario.md` — flujo de los tres roles y mantenimiento.
- `manuales/Criterios_de_aceptacion.md` — tabla 38 del diseno con el estado
  de cada criterio y que lo demuestra (pruebas automatizadas o bench).

Atajos: `tests/aceptacion.test.ts` (una prueba por CA), `npm run bench`,
`npm run backup` + `npm run backup -- --restaurar=<archivo>`.

## Cuentas de demostracion

Contrasena para todas: `demo1234`.

| Correo | Rol |
| ------ | --- |
| `admin@itmexicali.edu.mx` | `admin_tecnico` (acceso total por regla global) |
| `vinculacion@itmexicali.edu.mx` | `vinculacion` |
| `empresa@demo.com` | `empresa` (validada) |
| `alumno@itmexicali.edu.mx` | `estudiante` |

Son cuentas de desarrollo: antes de publicar hay que eliminarlas o cambiarles la
contrasena.

`npm run seed:demo` (opcional) agrega seis alumnos con curriculum, doce
vacantes en los siete estados y diez candidaturas, para probar el sistema con
volumen realista. Los alumnos de demostracion son `ashley.llamas@`,
`brayan.cardenas@`, `carla.ruiz@`, `diego.sanchez@`, `elena.vargas@` y
`francisco.nunez@itmexicali.edu.mx`, con la misma contrasena `demo1234`. Esta
semilla se excluye de `npm run seed` y no debe cargarse en una instalacion
real.

## Funcionalidades por rol

### Sitio publico (sin sesion)
- **Home** con hero slider, indicadores, vacantes destacadas, carreras y CTA.
- **Buscador** de vacantes con filtros (carrera, tipo, modalidad, ciudad,
  salario, fecha de publicacion, texto libre) y ordenamiento.
- **Detalle de vacante** con postulacion, favoritos, compartir y reporte.
- **Login y registro** (alumno o empresa) con recuperacion de contrasena.

### Panel del alumno
- **Resumen** con indicadores (postulaciones, favoritos, avisos, completitud del perfil).
- **Mi perfil** (datos academicos, habilidades, CV en PDF con subida y descarga firmada).
- **Mis postulaciones** con linea de tiempo y cancelacion (solo en estado `recibida`).
- **Favoritos** con tarjetas y aviso de vacante no disponible.
- **Notificaciones** con marcar leida / todas.

### Panel de la empresa
- **Mi empresa** (datos, logo, estatus de validacion).
- **Mis vacantes** (CRUD, envio a revision, pausar, reactivar, cerrar, eliminar borrador).
- **Candidatos** por vacante, con ficha del alumno, descarga de CV firmado y cambio de estado.
- **Exportacion CSV** de candidatos.

### Panel de Vinculacion y administracion
- **Usuarios y roles** (tabla + tarjetas, filtros, cambio de rol).
- **Moderacion** de vacantes (aprobar / rechazar con motivo).
- **Validacion de empresas** (aprobar / rechazar con motivo).
- **Reportes** ciudadanos sobre vacantes.
- **Indicadores** agregados por carrera, empresa y periodo.
- **Bitacora** de acciones administrativas.
- **Exportacion CSV** de vacantes, postulaciones y empresas.

## API disponible

Todas las rutas cuelgan de `/api/v1`. Las respuestas exitosas usan la envoltura
`{ "data": ... }`; las listas agregan `meta` con la paginacion, y los errores de
validacion responden 422 con `{ "message": ..., "errors": { campo: [mensajes] } }`.

### Autenticacion y catalogos

| Metodo | Ruta | Acceso |
| ------ | ---- | ------ |
| POST | `/auth/registro-estudiante` | publico |
| POST | `/auth/registro-empresa` | publico |
| POST | `/auth/verificar-correo` | publico |
| GET | `/auth/verificar-correo` | publico (enlace del correo) |
| POST | `/auth/login` | publico |
| POST | `/auth/recuperar` | publico |
| POST | `/auth/restablecer` | publico |
| POST | `/auth/logout` | autenticado |
| GET | `/auth/yo` | autenticado |
| GET | `/catalogos/carreras` | publico |
| GET | `/catalogos/tipos-vacante` | publico |
| GET | `/catalogos/modalidades` | publico |

### Buscador publico

| Metodo | Ruta | Acceso |
| ------ | ---- | ------ |
| GET | `/vacantes` | publico |
| GET | `/vacantes/{id}` | publico |
| GET | `/vacantes/{id}/similares` | publico |

Filtros de `GET /vacantes`, todos opcionales y combinables:

| Parametro | Ejemplo | Efecto |
| --------- | ------- | ------ |
| `carrera` | `3` | Id de la carrera sugerida |
| `tipo` | `practicas` | Uno de los cinco tipos |
| `modalidad` | `hibrida` | `presencial`, `hibrida` o `remota` |
| `ciudad` | `Mexicali` | Coincidencia parcial |
| `salario_min` | `8000` | El tope de la vacante debe alcanzarlo |
| `incluir_sin_salario` | `1` | Incluye vacantes que no publican sueldo |
| `publicadas` | `7d` | Publicadas en los ultimos 7 dias (`7d`, `24h`) |
| `q` | `desarrollo` | Texto completo sobre titulo y descripcion |
| `orden` | `relevancia` | `recientes`, `antiguas`, `sueldo`, `relevancia` |
| `pagina` | `2` | Pagina solicitada |
| `por_pagina` | `15` | Tamano de pagina (maximo 100) |

Una busqueda sin resultados devuelve `data: []` y `meta.total: 0`, nunca un
error. El contador de vistas de una vacante se incrementa una sola vez por
sesion.

### Perfil del estudiante

| Metodo | Ruta | Permiso |
| ------ | ---- | ------- |
| GET | `/perfil` | `perfil.editar` |
| PUT | `/perfil` | `perfil.editar` |
| POST | `/perfil/cv` | `perfil.editar` (multipart, campo `cv`) |
| GET | `/perfil/cv` | `perfil.editar` (devuelve enlace firmado) |

### Panel del estudiante

| Metodo | Ruta | Permiso |
| ------ | ---- | ------- |
| POST | `/postulaciones` | `postulaciones.crear` |
| GET | `/mis-postulaciones` | `postulaciones.propias` |
| GET | `/mis-postulaciones/{id}` | `postulaciones.propias` |
| DELETE | `/mis-postulaciones/{id}` | `postulaciones.propias` (solo si no fue revisada) |
| GET | `/favoritos` | `favoritos.gestionar` |
| POST | `/favoritos` | `favoritos.gestionar` |
| DELETE | `/favoritos/{vacante}` | `favoritos.gestionar` |
| GET | `/notificaciones` | autenticado |
| PUT | `/notificaciones/{id}/leida` | autenticado |
| POST | `/reportes` | `reportes.crear` |

Reglas de la postulacion: solo a vacantes `publicada` y vigentes; requiere
correo confirmado y curriculum cargado; el curriculum se copia al momento de
postularse para que la empresa vea el archivo que realmente recibio; la
candidatura solo avanza (no se cancela ni retrocede una vez revisada). Las
notas privadas de la empresa nunca salen en una respuesta del estudiante.

### Panel de la empresa

| Metodo | Ruta | Permiso |
| ------ | ---- | ------- |
| GET | `/empresa/tablero` | `indicadores.ver` |
| GET | `/empresa/perfil` | `perfil.editar` |
| PUT | `/empresa/perfil` | `perfil.editar` |
| POST | `/empresa/perfil/logo` | `perfil.editar` (multipart, campo `logo`) |
| GET | `/empresa/vacantes` | `vacantes.ver` |
| POST | `/empresa/vacantes` | `vacantes.crear` |
| GET | `/empresa/vacantes/{id}` | `vacantes.ver` |
| PUT | `/empresa/vacantes/{id}` | `vacantes.editar` |
| DELETE | `/empresa/vacantes/{id}` | `vacantes.editar` (solo en borrador) |
| POST | `/empresa/vacantes/{id}/enviar` | `vacantes.enviar` |
| POST | `/empresa/vacantes/{id}/pausar` | `vacantes.pausar` |
| POST | `/empresa/vacantes/{id}/reactivar` | `vacantes.pausar` |
| POST | `/empresa/vacantes/{id}/cerrar` | `vacantes.cerrar` |
| GET | `/empresa/vacantes/{id}/candidatos` | `postulaciones.gestionar` |
| GET | `/empresa/candidatos/{postulacion}` | `postulaciones.gestionar` |
| PUT | `/empresa/candidatos/{postulacion}/estado` | `postulaciones.gestionar` |
| GET | `/empresa/candidatos/{postulacion}/cv` | `postulaciones.gestionar` (devuelve enlace firmado) |
| GET | `/empresa/exportar/candidatos?vacante_id=` | `postulaciones.gestionar` |

La exportacion pide el permiso `reportes.exportar` en la tabla 26 del
documento, pero la matriz del apartado 4.7 solo se lo concede a Vinculacion.
Para que la empresa pueda descargar a sus propios candidatos se exige
`postulaciones.gestionar`, que es el permiso que si tiene. Es una
contradiccion del documento, no una correccion a la matriz, y conviene
reportarla.

### Moderacion y panel de Vinculacion

| Metodo | Ruta | Permiso |
| ------ | ---- | ------- |
| GET | `/admin/tablero` | `indicadores.ver` |
| GET | `/admin/indicadores?periodo=6m` | `indicadores.ver` |
| GET | `/admin/vacantes?estado=en_revision` | `vacantes.moderar` |
| POST | `/admin/vacantes/{id}/aprobar` | `vacantes.moderar` |
| POST | `/admin/vacantes/{id}/rechazar` | `vacantes.moderar` (motivo obligatorio) |
| POST | `/admin/vacantes/{id}/baja` | `vacantes.dar_baja` (motivo obligatorio) |
| GET | `/admin/empresas` | `empresas.validar` (pendientes, mas antiguas primero) |
| POST | `/admin/empresas/{id}/aprobar` | `empresas.validar` |
| POST | `/admin/empresas/{id}/rechazar` | `empresas.validar` (motivo obligatorio) |
| GET | `/admin/reportes` | `reportes.atender` (abiertos, mas antiguos primero) |
| PUT | `/admin/reportes/{id}` | `reportes.atender` |
| GET | `/admin/exportar/{recurso}` | `reportes.exportar` (`vacantes`, `postulaciones`, `empresas`) |
| GET | `/admin/usuarios` | `usuarios.gestionar` |
| PUT | `/admin/usuarios/{id}/rol` | `usuarios.gestionar` |
| GET | `/admin/bitacora` | `bitacora.ver` |

`usuarios.gestionar` y `bitacora.ver` solo tiene el `admin_tecnico` (via regla
global). Vinculacion no puede dar de alta ni cambiar el rol de nadie, y no ve
la bitacora tecnica; solo Vinculacion administra vacantes, empresas y
reportes.

`GET /admin/indicadores` acepta `periodo=30d|6m|12m` (por defecto 6 meses) y
los filtros opcionales `carrera_id` y `empresa_id`. Devuelve `meses` (serie
cronologica, rellenada con ceros), `por_carrera`, `por_empresa`,
`por_estado_postulacion` y `totales`. `GET /admin/exportar/{recurso}` filtra
las vacantes por `estado`, las postulaciones por `estado` y las empresas por
`estatus_validacion`.

### Archivos privados

| Metodo | Ruta | Acceso |
| ------ | ---- | ------ |
| GET | `/archivos/cv/{estudiante}?expira=&firma=` | firma vigente |
| GET | `/archivos/logo/{empresa}?expira=&firma=` | firma vigente |
| GET | `/archivos/postulacion/{postulacion}?expira=&firma=` | firma vigente |

Los enlaces vencen a los cinco minutos y los genera el servidor despues de
comprobar quien puede ver el archivo. El contenido se valida por sus primeros
bytes, no por la extension.

Autenticacion con `Authorization: Bearer <token>`; el token tiene la forma
`id|aleatorio` de Laravel Sanctum y en la base solo se guarda su hash SHA-256.

### Ejemplo

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"correo\":\"alumno@itmexicali.edu.mx\",\"contrasena\":\"demo1234\"}"
```

```json
{
  "data": {
    "usuario": {
      "id": 4,
      "nombre": "Alumno de Demostracion",
      "correo": "alumno@itmexicali.edu.mx",
      "estado": "activo",
      "rol": "estudiante",
      "permisos": ["favoritos.gestionar", "perfil.editar", "postulaciones.crear",
                   "postulaciones.propias", "reportes.crear", "vacantes.ver"]
    },
    "token": "4|Mf4Uez..."
  }
}
```

## Base de datos

Catorce tablas de negocio segun el diccionario de datos del apartado 4.4:

`users`, `estudiantes`, `empresas`, `carreras`, `vacantes`, `postulaciones`,
`favoritos`, `notificaciones`, `reportes`, `roles`, `permissions`,
`model_has_roles`, `model_has_permissions`, `role_has_permissions`.

Mas dos tablas de infraestructura que el documento no listaba pero que sus
propios endpoints requieren:

- `personal_access_tokens` — la tabla de Laravel Sanctum. El apartado 5.1 habla
  de tokens por dispositivo, asi que se reproduce su estructura exacta.
- `bitacora` — el endpoint `GET /admin/bitacora` y el apartado 8.5 exigen
  registrar cada accion administrativa con usuario, fecha y datos anteriores y
  nuevos. Sin esta tabla el requisito no se puede cumplir.

Los nombres de columna siguen el diccionario (`creado_en`, `actualizado_en`),
salvo en las tablas que replican paquetes de Laravel (`roles`, `permissions`,
`model_has_*`, `role_has_permissions`, `personal_access_tokens`), donde se
conservan `created_at` y `updated_at` porque asi los consultan los paquetes y asi
los esperaria Laravel si el esquema se migrara.

El DDL que produce el blueprint es el mismo que produciria Laravel sobre MySQL 8,
incluidos los nombres de indice (`users_correo_unique`,
`vacantes_empresa_id_estado_index`) y el indice FULLTEXT
`vacantes_busqueda_fulltext` que alimenta el buscador.

## Correo

En desarrollo el driver `log` escribe cada mensaje en `api/storage/logs/mail.log`
en lugar de enviarlo, para poder probar la verificacion de correo y el
restablecimiento de contrasena sin servidor SMTP. En produccion basta con poner
`MAIL_DRIVER=smtp` y llenar las credenciales en `api/.env`.

Los enlaces de verificacion y de restablecimiento se firman con HMAC-SHA256
usando `APP_KEY`, con vencimiento incluido en la firma. No hace falta una tabla
de tokens de un solo uso.

