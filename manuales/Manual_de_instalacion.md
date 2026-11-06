# Manual de instalacion - Job ITM

Bolsa de trabajo del Tecnologico de Mexicali. API REST en Node.js + Express 5 +
TypeScript con MySQL 8.

## 1. Requisitos

| Componente | Version | Notas |
|---|---|---|
| Node.js | 22+ | `node -v` |
| MySQL | 8 | el servidor institucional ya lo tiene |
| npm | 10+ | viene con Node |
| Git | cualquiera | para obtener el repositorio |

## 2. Instalacion

```bash
git clone <repositorio> "Job ITM"
cd "Job ITM"
npm install
copy api\.env.example api\.env     # ya trae Default de desarrollo
```

Abre `api/.env` y ajusta al menos:

- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`
- `APP_URL` (dominio institucional con HTTPS en produccion)
- `APP_TIMEZONE` (normalmente `America/Tijuana`)
- `MAIL_DRIVER=smtp`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_ENCRYPTION`
- `MAIL_FROM_ADDRESS` (correo institucional)
- `APP_KEY` (`npm run artisan -- key:generate`)

El archivo `.env` nunca se sube al repositorio: contiene credenciales.

## 3. Base de datos

```bash
npm run migrate:fresh   # borra y migra el esquema (usar solo en desarrollo)
npm run seed            # roles, permisos, catalogo de carreras, cuentas demo
npm run seed:demo       # opcional: datos de demostracion voluminosos
```

En el primer arranque basta `migrate`; `migrate:fresh` solo para desarrollo.

## 4. Arranque

Desarrollo:

```bash
npm run dev
```

Produccion:

```bash
npm run build        # no requerido; el proyecto corre directo con tsx
npm start
```

La API queda en `http://<host>:<puerto>/api/v1` y el chequeo de salud en `/salud`.

## 5. Tareas programadas (cron / Programador de tareas)

Sin estas tareas el estado `expirada` no se aplica por si solo.

### Linux (crontab)

```cron
0 2 * * * cd "/ruta/al/proyecto" && npm run schedule:run
0 3 * * * cd "/ruta/al/proyecto/api" && npm run backup
```

### Windows (Programador de tareas)

```powershell
schtasks /create /sc daily /tn "JobITM expirar" /tr "cmd /c 'cd C:\ruta\al\proyecto && npm run schedule:run'" /st 02:00
schtasks /create /sc daily /tn "JobITM respaldo" /tr "cmd /c 'cd C:\ruta\al\proyecto\api && npm run backup'" /st 03:00
```

## 6. Respaldo diario

El documento (apartado 8.5) exige respaldo diario de base y archivos.

```bash
cd api
npm run backup            # crea backups/<sello>.sql + <sello>-storage/
npm run backup -- --list  # lista los respaldos
npm run backup -- --restaurar=backups/<archivo>.sql  # restaura a una copia y compara
```

- La restauracion **no** pisa la base viva: crea `<nombre>_restauracion_...`,
  compara conteos y la borra salvo `--quedarse`.
- Retencion de siete dias.
- La primera prueba de restauracion debe hacerse antes de publicar:

```bash
npm run backup
npm run backup -- --restaurar=backups/<archivo que acaba de crearse>.sql
```

## 7. Publicacion final

1. Crear base `job_itm_produccion` (o el nombre elegido).
2. Ajustar `.env` con credenciales de produccion y `APP_ENV=production`.
3. `npm ci --production --omit=dev` (o `npm ci` si quieres correr pruebas).
4. `npm run migrate` (no `migrate:fresh`).
5. `npm run seed` (no `seed:demo`).
6. Crear el administrador tecnico a mano:
   `npm run artisan -- tinker` no existe; usa la siguiente consulta supervisada:
   - inserta un usuario con rol `admin_tecnico` o asigna el rol a una cuenta
     existente (ver `api/src/database/seeders/usuarios.ts` como plantilla).
7. `npm run schedule:run` y verificar que expira vacantes pasadas.
8. `npm run backup` y `--restaurar` para certificar el respaldo.
9. Arrancar con `npm start`, validar salud en `http://.../salud`.

## 8. Notas de despliegue

- El documento asume un servidor institucional Linux con PHP; este desarrollo
  usa Node.js, por lo que el despliegue es: Node 22 + MySQL 8 + SMTP.
- HTTPS es obligatorio en produccion (certificado de la institucion).
- Los currículums y logos viven en `api/storage/` fuera del docroot web.
- Los enlaces de verificacion y restablecimiento usan el dominio de `APP_URL`.
