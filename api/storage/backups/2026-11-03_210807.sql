-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: job_itm
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `bitacora`
--

DROP TABLE IF EXISTS `bitacora`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bitacora` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `accion` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'aprobar_vacante, rechazar_empresa, cambio_rol...',
  `entidad` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entidad_id` bigint unsigned DEFAULT NULL,
  `datos_anteriores` json DEFAULT NULL,
  `datos_nuevos` json DEFAULT NULL,
  `ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `bitacora_user_id_foreign` (`user_id`),
  KEY `bitacora_entidad_entidad_id_index` (`entidad`,`entidad_id`),
  KEY `bitacora_creado_en_index` (`creado_en`),
  CONSTRAINT `bitacora_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bitacora`
--

LOCK TABLES `bitacora` WRITE;
/*!40000 ALTER TABLE `bitacora` DISABLE KEYS */;
/*!40000 ALTER TABLE `bitacora` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `carreras`
--

DROP TABLE IF EXISTS `carreras`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `carreras` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clave` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activa` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `carreras_nombre_unique` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `carreras`
--

LOCK TABLES `carreras` WRITE;
/*!40000 ALTER TABLE `carreras` DISABLE KEYS */;
INSERT INTO `carreras` VALUES (1,'Ingenieria en Sistemas Computacionales','ISC',1,'2026-11-04 04:51:11'),(2,'Ingenieria Industrial','IIND',1,'2026-11-04 04:51:11'),(3,'Ingenieria Mecanica','IMEC',1,'2026-11-04 04:51:11'),(4,'Ingenieria Electrica','IELC',1,'2026-11-04 04:51:11'),(5,'Ingenieria Electronica','IELT',1,'2026-11-04 04:51:11'),(6,'Ingenieria en Gestion Empresarial','IGEM',1,'2026-11-04 04:51:11'),(7,'Ingenieria en Logistica','ILOG',1,'2026-11-04 04:51:11'),(8,'Ingenieria Quimica','IQ',1,'2026-11-04 04:51:11'),(9,'Ingenieria Bioquimica','IBQ',1,'2026-11-04 04:51:11'),(10,'Ingenieria en Materiales','IMAT',1,'2026-11-04 04:51:11'),(11,'Licenciatura en Administracion','LA',1,'2026-11-04 04:51:11');
/*!40000 ALTER TABLE `carreras` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `empresas`
--

DROP TABLE IF EXISTS `empresas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `empresas` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `razon_social` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rfc` varchar(13) COLLATE utf8mb4_unicode_ci NOT NULL,
  `giro` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sitio_web` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contacto_nombre` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contacto_correo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logo_ruta` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estatus_validacion` enum('pendiente','aprobada','rechazada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `motivo_rechazo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `validado_por` bigint unsigned DEFAULT NULL,
  `validado_en` datetime DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `empresas_rfc_unique` (`rfc`),
  UNIQUE KEY `empresas_user_id_unique` (`user_id`),
  KEY `empresas_validado_por_foreign` (`validado_por`),
  CONSTRAINT `empresas_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `empresas_validado_por_foreign` FOREIGN KEY (`validado_por`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `empresas`
--

LOCK TABLES `empresas` WRITE;
/*!40000 ALTER TABLE `empresas` DISABLE KEYS */;
INSERT INTO `empresas` VALUES (1,3,'Grupo Industrial del Valle','GIV200101AB1','Manufactura','https://ejemplo.com','6861234567','Laura Mendoza','rrhh@demo.com',NULL,'aprobada',NULL,2,'2026-11-04 04:51:12','2026-11-04 04:51:12','2026-11-04 04:51:12');
/*!40000 ALTER TABLE `empresas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `estudiantes`
--

DROP TABLE IF EXISTS `estudiantes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `estudiantes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `matricula` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `carrera_id` bigint unsigned NOT NULL,
  `semestre` tinyint DEFAULT NULL,
  `anio_egreso` smallint DEFAULT NULL,
  `telefono` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cv_ruta` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cv_actualizado_en` datetime DEFAULT NULL,
  `habilidades` varchar(400) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `estudiantes_matricula_unique` (`matricula`),
  UNIQUE KEY `estudiantes_user_id_unique` (`user_id`),
  KEY `estudiantes_carrera_id_foreign` (`carrera_id`),
  CONSTRAINT `estudiantes_carrera_id_foreign` FOREIGN KEY (`carrera_id`) REFERENCES `carreras` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `estudiantes_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `estudiantes`
--

LOCK TABLES `estudiantes` WRITE;
/*!40000 ALTER TABLE `estudiantes` DISABLE KEYS */;
INSERT INTO `estudiantes` VALUES (1,4,'20300001',1,8,NULL,'6861234567',NULL,NULL,'JavaScript, TypeScript, Node.js, MySQL, React','2026-11-04 04:51:12','2026-11-04 04:51:12'),(2,5,'20400001',1,9,NULL,'6861000001','cv/4534f5f3-8566-4974-a230-9f0b09be22e7.pdf','2026-11-04 04:51:14','Node.js, TypeScript, React, MySQL, Docker','2026-11-04 04:51:14','2026-11-04 04:51:14'),(3,6,'20400002',2,8,NULL,'6861000002','cv/f830893e-f4df-488a-848c-6f2849670642.pdf','2026-11-04 04:51:15','Lean Manufacturing, Six Sigma, Excel avanzado, Power BI','2026-11-04 04:51:15','2026-11-04 04:51:15'),(4,7,'20400003',6,NULL,2025,'6861000003','cv/eed6d865-7a08-473b-90fa-7dd65f101329.pdf','2026-11-04 04:51:15','Gestion de proyectos, Recursos Humanos, SAP, Ingles B2','2026-11-04 04:51:15','2026-11-04 04:51:15'),(5,8,'20400004',3,7,NULL,'6861000004','cv/461c9d60-14b6-4421-aa60-11b6fdb6cc0a.pdf','2026-11-04 04:51:15','SolidWorks, AutoCAD, Mantenimiento industrial, CNC','2026-11-04 04:51:15','2026-11-04 04:51:15'),(6,9,'20400005',1,6,NULL,'6861000005','cv/3e8d56b6-6d49-4771-ba48-af0bfee3560f.pdf','2026-11-04 04:51:15','Python, SQL, Machine Learning basico, Git','2026-11-04 04:51:15','2026-11-04 04:51:15'),(7,10,'20400006',5,9,NULL,'6861000006','cv/6d9064aa-05f8-4ae2-8d22-6b97abdf4ce0.pdf','2026-11-04 04:51:16','PLC, Electronica de potencia, MATLAB, IoT','2026-11-04 04:51:16','2026-11-04 04:51:16');
/*!40000 ALTER TABLE `estudiantes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `favoritos`
--

DROP TABLE IF EXISTS `favoritos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `favoritos` (
  `estudiante_id` bigint unsigned NOT NULL,
  `vacante_id` bigint unsigned NOT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`estudiante_id`,`vacante_id`),
  KEY `favoritos_vacante_id_foreign` (`vacante_id`),
  CONSTRAINT `favoritos_estudiante_id_foreign` FOREIGN KEY (`estudiante_id`) REFERENCES `estudiantes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `favoritos_vacante_id_foreign` FOREIGN KEY (`vacante_id`) REFERENCES `vacantes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `favoritos`
--

LOCK TABLES `favoritos` WRITE;
/*!40000 ALTER TABLE `favoritos` DISABLE KEYS */;
/*!40000 ALTER TABLE `favoritos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'2026_10_25_000001_create_users_table',1),(2,'2026_10_25_000002_create_carreras_table',1),(3,'2026_10_25_000003_create_estudiantes_table',1),(4,'2026_10_25_000004_create_empresas_table',1),(5,'2026_10_25_000005_create_vacantes_table',1),(6,'2026_10_25_000006_create_postulaciones_table',1),(7,'2026_10_25_000007_create_favoritos_table',1),(8,'2026_10_25_000008_create_notificaciones_table',1),(9,'2026_10_25_000009_create_reportes_table',1),(10,'2026_10_25_000010_create_roles_table',1),(11,'2026_10_25_000011_create_permissions_table',1),(12,'2026_10_25_000012_create_model_has_roles_table',1),(13,'2026_10_25_000013_create_model_has_permissions_table',1),(14,'2026_10_25_000014_create_role_has_permissions_table',1),(15,'2026_10_25_000015_create_personal_access_tokens_table',1),(16,'2026_10_25_000016_create_bitacora_table',1);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `model_has_permissions`
--

DROP TABLE IF EXISTS `model_has_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `model_has_permissions` (
  `permission_id` bigint unsigned NOT NULL,
  `model_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `model_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`permission_id`,`model_id`,`model_type`),
  KEY `model_has_permissions_model_id_model_type_index` (`model_id`,`model_type`),
  CONSTRAINT `model_has_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `model_has_permissions`
--

LOCK TABLES `model_has_permissions` WRITE;
/*!40000 ALTER TABLE `model_has_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `model_has_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `model_has_roles`
--

DROP TABLE IF EXISTS `model_has_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `model_has_roles` (
  `role_id` bigint unsigned NOT NULL,
  `model_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `model_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`role_id`,`model_id`,`model_type`),
  KEY `model_has_roles_model_id_model_type_index` (`model_id`,`model_type`),
  CONSTRAINT `model_has_roles_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `model_has_roles`
--

LOCK TABLES `model_has_roles` WRITE;
/*!40000 ALTER TABLE `model_has_roles` DISABLE KEYS */;
INSERT INTO `model_has_roles` VALUES (4,'App\\Models\\User',1),(3,'App\\Models\\User',2),(2,'App\\Models\\User',3),(1,'App\\Models\\User',4),(1,'App\\Models\\User',5),(1,'App\\Models\\User',6),(1,'App\\Models\\User',7),(1,'App\\Models\\User',8),(1,'App\\Models\\User',9),(1,'App\\Models\\User',10);
/*!40000 ALTER TABLE `model_has_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notificaciones`
--

DROP TABLE IF EXISTS `notificaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notificaciones` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `tipo` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Clave del evento, por ejemplo postulacion_recibida.',
  `titulo` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mensaje` varchar(400) COLLATE utf8mb4_unicode_ci NOT NULL,
  `url` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `leida_en` datetime DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `notificaciones_user_id_leida_en_index` (`user_id`,`leida_en`),
  CONSTRAINT `notificaciones_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notificaciones`
--

LOCK TABLES `notificaciones` WRITE;
/*!40000 ALTER TABLE `notificaciones` DISABLE KEYS */;
/*!40000 ALTER TABLE `notificaciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(125) COLLATE utf8mb4_unicode_ci NOT NULL,
  `guard_name` varchar(125) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_name_guard_name_unique` (`name`,`guard_name`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES (1,'vacantes.ver','api',NULL,NULL),(2,'vacantes.crear','api',NULL,NULL),(3,'vacantes.editar','api',NULL,NULL),(4,'vacantes.enviar','api',NULL,NULL),(5,'vacantes.pausar','api',NULL,NULL),(6,'vacantes.cerrar','api',NULL,NULL),(7,'vacantes.moderar','api',NULL,NULL),(8,'vacantes.dar_baja','api',NULL,NULL),(9,'postulaciones.crear','api',NULL,NULL),(10,'postulaciones.propias','api',NULL,NULL),(11,'postulaciones.gestionar','api',NULL,NULL),(12,'perfil.editar','api',NULL,NULL),(13,'favoritos.gestionar','api',NULL,NULL),(14,'empresas.validar','api',NULL,NULL),(15,'reportes.crear','api',NULL,NULL),(16,'reportes.atender','api',NULL,NULL),(17,'indicadores.ver','api',NULL,NULL),(18,'reportes.exportar','api',NULL,NULL),(19,'usuarios.gestionar','api',NULL,NULL),(20,'bitacora.ver','api',NULL,NULL);
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `personal_access_tokens`
--

DROP TABLE IF EXISTS `personal_access_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text COLLATE utf8mb4_unicode_ci,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal_access_tokens`
--

LOCK TABLES `personal_access_tokens` WRITE;
/*!40000 ALTER TABLE `personal_access_tokens` DISABLE KEYS */;
INSERT INTO `personal_access_tokens` VALUES (1,'App\\Models\\User',2,'web','48002acd476f8435a65f6a610e18d1f4566be47307ef21b1be2c8ee923ecba1e','*','2026-11-04 04:51:31','2026-12-04 04:51:31',NULL,NULL);
/*!40000 ALTER TABLE `personal_access_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `postulaciones`
--

DROP TABLE IF EXISTS `postulaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `postulaciones` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `vacante_id` bigint unsigned NOT NULL,
  `estudiante_id` bigint unsigned NOT NULL,
  `cv_ruta` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mensaje` varchar(600) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('recibida','en_revision','contactado','entrevista','contratado','rechazado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'recibida',
  `notas_empresa` varchar(600) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_estado` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `postulaciones_vacante_id_estudiante_id_unique` (`vacante_id`,`estudiante_id`),
  KEY `postulaciones_estudiante_id_estado_index` (`estudiante_id`,`estado`),
  CONSTRAINT `postulaciones_estudiante_id_foreign` FOREIGN KEY (`estudiante_id`) REFERENCES `estudiantes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `postulaciones_vacante_id_foreign` FOREIGN KEY (`vacante_id`) REFERENCES `vacantes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `postulaciones`
--

LOCK TABLES `postulaciones` WRITE;
/*!40000 ALTER TABLE `postulaciones` DISABLE KEYS */;
INSERT INTO `postulaciones` VALUES (1,1,2,'postulaciones/1fbe2363-074a-4abe-9ac9-eaf71fae1296.pdf','Me interesa la vacante y cuento con la experiencia que solicitan.','entrevista',NULL,'2026-11-04 04:51:16','2026-11-04 04:51:15','2026-11-04 04:51:15'),(2,1,6,'postulaciones/b2bc838d-4f11-4719-bcc4-059bbdba28a7.pdf','Me interesa la vacante y cuento con la experiencia que solicitan.','en_revision',NULL,'2026-11-04 04:51:16','2026-11-04 04:51:15','2026-11-04 04:51:15'),(3,6,7,'postulaciones/9678d2d4-4895-4699-bcfb-12cebb45c09e.pdf','Me interesa la vacante y cuento con la experiencia que solicitan.','contactado',NULL,'2026-11-04 04:51:16','2026-11-04 04:51:15','2026-11-04 04:51:15'),(4,4,3,'postulaciones/81fca739-da91-424e-8df4-fcea65b1d33a.pdf','Me interesa la vacante y cuento con la experiencia que solicitan.','recibida',NULL,'2026-11-04 04:51:16','2026-11-04 04:51:15','2026-11-04 04:51:15'),(5,4,5,'postulaciones/79bcb630-c3b5-4f10-bda7-935f71469d41.pdf','Me interesa la vacante y cuento con la experiencia que solicitan.','rechazado',NULL,'2026-11-04 04:51:16','2026-11-04 04:51:15','2026-11-04 04:51:15'),(6,2,4,'postulaciones/bf93a04d-52b9-448f-922a-ce3c1e8c31e3.pdf','Me interesa la vacante y cuento con la experiencia que solicitan.','contratado',NULL,'2026-11-04 04:51:16','2026-11-04 04:51:15','2026-11-04 04:51:15'),(7,2,3,'postulaciones/07ae7d31-5fd4-43e7-b0e5-8beae661f16e.pdf','Me interesa la vacante y cuento con la experiencia que solicitan.','recibida',NULL,'2026-11-04 04:51:16','2026-11-04 04:51:15','2026-11-04 04:51:15'),(8,5,4,'postulaciones/8e2053d9-dad2-4d7c-bb37-0c8380e4d763.pdf','Me interesa la vacante y cuento con la experiencia que solicitan.','en_revision',NULL,'2026-11-04 04:51:16','2026-11-04 04:51:15','2026-11-04 04:51:15'),(9,3,6,'postulaciones/77bb610a-60f3-4bd0-a94d-3f3583ae2edc.pdf','Me interesa la vacante y cuento con la experiencia que solicitan.','recibida',NULL,'2026-11-04 04:51:16','2026-11-04 04:51:15','2026-11-04 04:51:15'),(10,3,2,'postulaciones/4ea2efc0-58b8-41d6-b04f-350a099a3a38.pdf','Me interesa la vacante y cuento con la experiencia que solicitan.','contactado',NULL,'2026-11-04 04:51:16','2026-11-04 04:51:15','2026-11-04 04:51:15');
/*!40000 ALTER TABLE `postulaciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reportes`
--

DROP TABLE IF EXISTS `reportes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reportes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `vacante_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `motivo` enum('informacion_falsa','duplicada','discriminatoria','datos_de_contacto','otro') COLLATE utf8mb4_unicode_ci NOT NULL,
  `detalle` varchar(600) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('nuevo','en_revision','resuelto','descartado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'nuevo',
  `atendido_por` bigint unsigned DEFAULT NULL,
  `atendido_en` datetime DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `reportes_vacante_id_foreign` (`vacante_id`),
  KEY `reportes_user_id_foreign` (`user_id`),
  KEY `reportes_atendido_por_foreign` (`atendido_por`),
  KEY `reportes_estado_creado_en_index` (`estado`,`creado_en`),
  CONSTRAINT `reportes_atendido_por_foreign` FOREIGN KEY (`atendido_por`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `reportes_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reportes_vacante_id_foreign` FOREIGN KEY (`vacante_id`) REFERENCES `vacantes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reportes`
--

LOCK TABLES `reportes` WRITE;
/*!40000 ALTER TABLE `reportes` DISABLE KEYS */;
/*!40000 ALTER TABLE `reportes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_has_permissions`
--

DROP TABLE IF EXISTS `role_has_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_has_permissions` (
  `permission_id` bigint unsigned NOT NULL,
  `role_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`permission_id`,`role_id`),
  KEY `role_has_permissions_role_id_foreign` (`role_id`),
  CONSTRAINT `role_has_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_has_permissions_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_has_permissions`
--

LOCK TABLES `role_has_permissions` WRITE;
/*!40000 ALTER TABLE `role_has_permissions` DISABLE KEYS */;
INSERT INTO `role_has_permissions` VALUES (1,1),(9,1),(10,1),(12,1),(13,1),(15,1),(1,2),(2,2),(3,2),(4,2),(5,2),(6,2),(11,2),(12,2),(15,2),(17,2),(1,3),(6,3),(7,3),(8,3),(11,3),(12,3),(14,3),(16,3),(17,3),(18,3);
/*!40000 ALTER TABLE `role_has_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(125) COLLATE utf8mb4_unicode_ci NOT NULL,
  `guard_name` varchar(125) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_name_guard_name_unique` (`name`,`guard_name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'estudiante','api',NULL,NULL),(2,'empresa','api',NULL,NULL),(3,'vinculacion','api',NULL,NULL),(4,'admin_tecnico','api',NULL,NULL);
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `correo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contrasena` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Hash bcrypt; nunca la contrasena en claro.',
  `correo_verificado_en` datetime DEFAULT NULL,
  `estado` enum('activo','suspendido') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'activo',
  `ultimo_acceso_en` datetime DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_correo_unique` (`correo`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Administrador Tecnico','admin@itmexicali.edu.mx','$2b$12$y0W2OemD/cpkkANtRkG/.uq4lkYSS3nK4bYMY.0NL4uxKVroY9Bpa','2026-11-04 04:51:12','activo',NULL,'2026-11-04 04:51:11','2026-11-04 04:51:11'),(2,'Vinculacion Estudiantil','vinculacion@itmexicali.edu.mx','$2b$12$7zvZ4PKBXAGO2u3JH3RVWOq1/2cf1DmHTlpAGCTm/Ki5R6056tw8O','2026-11-04 04:51:12','activo','2026-11-04 04:51:31','2026-11-04 04:51:11','2026-11-04 04:51:31'),(3,'Grupo Industrial del Valle','empresa@demo.com','$2b$12$Nkbk1GT/4HxKXZHVbi5s3ujVx3YW/uxURp/LJFWUWHdIN.N8nPSxK','2026-11-04 04:51:12','activo',NULL,'2026-11-04 04:51:12','2026-11-04 04:51:12'),(4,'Alumno de Demostracion','alumno@itmexicali.edu.mx','$2b$12$CRhnGRN1tzHXYf3wrbLDFOIzu6C3G4yMnlWY.xQU9T8NJllxCx2wq','2026-11-04 04:51:12','activo',NULL,'2026-11-04 04:51:12','2026-11-04 04:51:12'),(5,'Ashley Llamas','ashley.llamas@itmexicali.edu.mx','$2b$12$kfXgDTlMD2rGTVQ4pJF.yO5AFJDATZ8akFUd7QBRjrukLerlz3vye','2026-11-04 04:51:14','activo',NULL,'2026-11-04 04:51:14','2026-11-04 04:51:14'),(6,'Brayan Cardenas','brayan.cardenas@itmexicali.edu.mx','$2b$12$o99TOeYJhHsMFPgtvseeOO6c6.QitpGxqMl.522Cam4wBXUIGwKUC','2026-11-04 04:51:15','activo',NULL,'2026-11-04 04:51:14','2026-11-04 04:51:14'),(7,'Carla Ruiz','carla.ruiz@itmexicali.edu.mx','$2b$12$8VG5jO3agUxqRLbK6i3oa..MglOFIdQH0RGw6IpdbpuE8hXiNGBtG','2026-11-04 04:51:15','activo',NULL,'2026-11-04 04:51:14','2026-11-04 04:51:14'),(8,'Diego Sanchez','diego.sanchez@itmexicali.edu.mx','$2b$12$GMWuaWxU5Wc7V7c5K3A/resvWZgMT3x4maHoORx86ROxvLnhz5LKW','2026-11-04 04:51:15','activo',NULL,'2026-11-04 04:51:15','2026-11-04 04:51:15'),(9,'Elena Vargas','elena.vargas@itmexicali.edu.mx','$2b$12$Hk2jJWt55.6Xf/HN1sbbCu5TbV17V54NKQRo1Qsl6yY8ulJdYMjpy','2026-11-04 04:51:15','activo',NULL,'2026-11-04 04:51:15','2026-11-04 04:51:15'),(10,'Francisco Nunez','francisco.nunez@itmexicali.edu.mx','$2b$12$TJZQfZPvE/3MrTXwlfFq9.aaBUKKbWAuLmCcUvRnTKz0JndTan4gG','2026-11-04 04:51:16','activo',NULL,'2026-11-04 04:51:15','2026-11-04 04:51:15');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vacantes`
--

DROP TABLE IF EXISTS `vacantes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vacantes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `empresa_id` bigint unsigned NOT NULL,
  `carrera_id` bigint unsigned DEFAULT NULL,
  `titulo` varchar(140) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `requisitos` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `actividades` text COLLATE utf8mb4_unicode_ci,
  `tipo` enum('practicas','servicio_social','servicios_profesionales','temporal','planta') COLLATE utf8mb4_unicode_ci NOT NULL,
  `modalidad` enum('presencial','hibrida','remota') COLLATE utf8mb4_unicode_ci NOT NULL,
  `ciudad` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado_geo` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `salario_min` decimal(10,2) DEFAULT NULL,
  `salario_max` decimal(10,2) DEFAULT NULL,
  `mostrar_salario` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_publicacion` datetime DEFAULT NULL,
  `fecha_cierre` date NOT NULL,
  `estado` enum('borrador','en_revision','publicada','pausada','rechazada','cerrada','expirada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'borrador',
  `motivo_rechazo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `moderado_por` bigint unsigned DEFAULT NULL,
  `moderado_en` datetime DEFAULT NULL,
  `vistas` int NOT NULL DEFAULT '0',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `vacantes_moderado_por_foreign` (`moderado_por`),
  KEY `vacantes_estado_fecha_cierre_index` (`estado`,`fecha_cierre`),
  KEY `vacantes_empresa_id_estado_index` (`empresa_id`,`estado`),
  KEY `vacantes_carrera_id_estado_index` (`carrera_id`,`estado`),
  FULLTEXT KEY `vacantes_busqueda_fulltext` (`titulo`,`descripcion`),
  CONSTRAINT `vacantes_carrera_id_foreign` FOREIGN KEY (`carrera_id`) REFERENCES `carreras` (`id`) ON DELETE SET NULL,
  CONSTRAINT `vacantes_empresa_id_foreign` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `vacantes_moderado_por_foreign` FOREIGN KEY (`moderado_por`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=1013 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vacantes`
--

LOCK TABLES `vacantes` WRITE;
/*!40000 ALTER TABLE `vacantes` DISABLE KEYS */;
INSERT INTO `vacantes` VALUES (1,1,1,'Desarrollador Full Stack','Desarrollo de aplicaciones web con React y Node.js para el area de transformacion digital. Participaras en el diseno de APIs, la integracion con sistemas internos y la puesta en produccion.','Ingenieria en Sistemas Computacionales o afin, experiencia con JavaScript y bases de datos relacionales, ingles tecnico de lectura.',NULL,'planta','hibrida','Mexicali','Baja California',18000.00,26000.00,1,'2026-11-04 04:51:16','2026-12-18','publicada',NULL,NULL,NULL,0,'2026-11-04 04:51:15','2026-11-04 04:51:15'),(2,1,6,'Practicante de Recursos Humanos','Apoyo en reclutamiento, integracion de expedientes y actividades de clima laboral. Horario compatible con el semestre.','Estudiante de Gestion Empresarial o Administracion, sexto semestre en adelante.',NULL,'practicas','presencial','Mexicali','Baja California',4500.00,6000.00,1,'2026-11-04 04:51:16','2026-12-03','publicada',NULL,NULL,NULL,0,'2026-11-04 04:51:15','2026-11-04 04:51:15'),(3,1,1,'Analista de datos junior','Construccion de tableros y modelos de datos para el area comercial. Trabajo 100 por ciento remoto con equipo distribuido.','SQL, Python y nociones de visualizacion de datos.',NULL,'servicios_profesionales','remota','Tijuana','Baja California',15000.00,20000.00,1,'2026-11-04 04:51:16','2026-11-23','publicada',NULL,NULL,NULL,0,'2026-11-04 04:51:15','2026-11-04 04:51:15'),(4,1,3,'Ingeniero de mantenimiento','Planeacion del mantenimiento preventivo y correctivo de la linea de produccion. Coordinacion con proveedores y supervision de tecnicos.','Ingenieria Mecanica o Industrial, conocimiento de TPM y lectura de planos.',NULL,'planta','presencial','Mexicali','Baja California',22000.00,30000.00,1,'2026-11-04 04:51:16','2027-01-02','publicada',NULL,NULL,NULL,0,'2026-11-04 04:51:15','2026-11-04 04:51:15'),(5,1,6,'Servicio social en vinculacion','Apoyo en la gestion de convenios con empresas y seguimiento a egresados. Se otorga beca de transporte.','Estudiante activo con al menos 70 por ciento de creditos.',NULL,'servicio_social','presencial','Mexicali','Baja California',NULL,NULL,0,'2026-11-04 04:51:16','2026-11-28','publicada',NULL,NULL,NULL,0,'2026-11-04 04:51:15','2026-11-04 04:51:15'),(6,1,5,'Tecnico electronico de pruebas','Pruebas de tarjetas electronicas en linea de ensamble. Contrato por proyecto de seis meses.','Electronica, manejo de multimetro y osciloscopio.',NULL,'temporal','presencial','Tecate','Baja California',12000.00,14000.00,1,'2026-11-04 04:51:16','2026-11-18','publicada',NULL,NULL,NULL,0,'2026-11-04 04:51:15','2026-11-04 04:51:15'),(7,1,7,'Coordinador de logistica','Control de inventarios, rutas de distribucion y negociacion con transportistas.','Ingenieria en Logistica o Industrial, manejo de WMS.',NULL,'planta','presencial','Mexicali','Baja California',20000.00,25000.00,1,NULL,'2026-12-13','en_revision',NULL,NULL,NULL,0,'2026-11-04 04:51:15','2026-11-04 04:51:15'),(8,1,11,'Asistente administrativo','Apoyo en facturacion, archivo y atencion a proveedores.','Administracion, manejo de paqueteria de oficina.',NULL,'temporal','presencial','Mexicali','Baja California',9000.00,11000.00,1,NULL,'2026-12-08','borrador',NULL,NULL,NULL,0,'2026-11-04 04:51:15','2026-11-04 04:51:15'),(9,1,5,'Practicante de automatizacion','Apoyo en programacion de PLC y pruebas de tableros.','Estudiante de Electronica con conocimiento de PLC.',NULL,'practicas','presencial','Mexicali','Baja California',4000.00,5000.00,1,NULL,'2026-12-03','rechazada','La descripcion no indica el horario ni las actividades concretas del practicante. Corrige y vuelve a enviar.',NULL,NULL,0,'2026-11-04 04:51:15','2026-11-04 04:51:15'),(10,1,2,'Supervisor de produccion','Supervision de turno, control de indicadores y seguimiento a metas de produccion.','Ingenieria Industrial, experiencia en piso de produccion.',NULL,'planta','presencial','Mexicali','Baja California',24000.00,28000.00,1,NULL,'2026-12-23','pausada',NULL,NULL,NULL,0,'2026-11-04 04:51:15','2026-11-04 04:51:15'),(11,1,2,'Becario de calidad','Apoyo en auditorias internas y control de documentacion.','Ingenieria Industrial, conocimiento de ISO 9001.',NULL,'practicas','presencial','Mexicali','Baja California',5000.00,5000.00,1,NULL,'2026-11-13','cerrada',NULL,NULL,NULL,0,'2026-11-04 04:51:15','2026-11-04 04:51:15'),(12,1,1,'Auxiliar de sistemas','Soporte tecnico a usuarios y mantenimiento de equipos.','Sistemas Computacionales, conocimiento de redes.',NULL,'temporal','presencial','Mexicali','Baja California',10000.00,12000.00,1,NULL,'2026-10-29','expirada',NULL,NULL,NULL,0,'2026-11-04 04:51:15','2026-11-04 04:51:15');
/*!40000 ALTER TABLE `vacantes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'job_itm'
--

--
-- Dumping routines for database 'job_itm'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-03 21:08:07
