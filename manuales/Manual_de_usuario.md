# Manual de usuario - Job ITM

Guia de los tres modos de acceso al portal: alumno, empresa y Vinculacion.

## Alumno

1. Registro en `POST /auth/registro-estudiante` con correo y datos academicos.
2. Verificar el correo (enlace de 24 h). Sin verificacion no puedes postularte.
3. Completar el perfil en `GET/PUT /perfil` y subir tu CV en PDF.
4. Buscar vacante en `GET /vacantes` (filtros combinables).
5. Postularte en `POST /postulaciones` (una sola vez por vacante).
6. Consultar tus candidaturas en `GET /mis-postulaciones` (con linea de tiempo)
   y cancelar las que aun no revisaron en `DELETE /mis-postulaciones/{id}`.
7. Si alguien enlazo un PDF cualquiera no es tuyo; solo se abren con enlace
   firmado de 5 minutos.
8. Las notas de la empresa en tu candidatura nunca se muestran.

## Empresa

1. Registro en `POST /auth/registro-empresa`; tu cuenta nace `pendiente`.
2. Vinculacion revisa el registro; te notificaran para publicar.
3. Mi perfil: `GET/PUT /empresa/perfil` con tu logo.
4. Crear vacante: `POST /empresa/vacantes` (nace en borrador).
5. Enviar a revision: `POST /empresa/vacantes/{id}/enviar`.
6. Una vez publica, la vacante aparecera en el buscador.
7. Ver candidatos: `GET /empresa/vacantes/{id}/candidatos`.
8. Cambiar estado: `PUT /empresa/candidatos/{p}/estado` (solo avanza).
9. No dupliques intermediarios: cada cambio dispara correo + aviso interno.
10. Descarga tu listado: `GET /empresa/exportar/candidatos?vacante_id=` (CSV).

## Vinculacion

1. Bandeja de moderacion: `GET /admin/vacantes` listas en orden de llegada.
2. Aprobar/rechazar: `POST /admin/vacantes/{id}/aprobar|rechazar`.
3. Validar empresas pendientes: `GET /admin/empresas`, `POST /admin/empresas/{id}/aprobar|rechazar`.
4. Baja administrativa: `POST /admin/vacantes/{id}/baja` (motivo obligatorio).
5. Atender reportes: `GET /admin/reportes`, `PUT /admin/reportes/{id}`.
6. Tablero: `GET /admin/tablero` y `GET /admin/indicadores?periodo=6m`.
7. Exportar: `GET /admin/exportar/{vacantes|postulaciones|empresas}` (CSV).
8. Todo lo que haces queda en la bitacora con tu usuario y fecha.

## Administrador tecnico

- Acceso total a todo (regla `Gate::before`).
- `GET /admin/usuarios`, `PUT /admin/usuarios/{id}/rol`, `GET /admin/bitacora`.
- No puede cambiar su propio rol.
