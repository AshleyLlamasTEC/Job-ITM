import type { SchemaFacade } from "../../support/database/schema";

/**
 * Oportunidad publicada por una empresa.
 *
 * Es la tabla central del negocio y la que mas indices requiere, porque
 * alimenta el buscador publico. El estado controla la visibilidad: solo
 * `publicada` aparece en el buscador, y solo mientras `fecha_cierre` no haya
 * pasado.
 */
export async function up(schema: SchemaFacade): Promise<void> {
  await schema.create("vacantes", (t) => {
    t.id();
    t.foreignId("empresa_id").constrained("empresas").cascadeOnDelete();
    t.foreignId("carrera_id").nullable().constrained("carreras").nullOnDelete();
    t.string("titulo", 140);
    t.text("descripcion");
    t.text("requisitos");
    t.text("actividades").nullable();
    t.enum("tipo", ["practicas", "servicio_social", "servicios_profesionales", "temporal", "planta"]);
    t.enum("modalidad", ["presencial", "hibrida", "remota"]);
    t.string("ciudad", 80);
    t.string("estado_geo", 80).nullable();
    t.decimal("salario_min", 10, 2).nullable();
    t.decimal("salario_max", 10, 2).nullable();
    t.boolean("mostrar_salario").default(true);
    t.dateTime("fecha_publicacion").nullable();
    t.date("fecha_cierre");
    t.enum("estado", ["borrador", "en_revision", "publicada", "pausada", "rechazada", "cerrada", "expirada"])
      .default("borrador");
    t.string("motivo_rechazo", 255).nullable();
    t.foreignId("moderado_por").nullable().constrained("users").nullOnDelete();
    t.dateTime("moderado_en").nullable();
    t.integer("vistas").default(0);
    t.timestamps();

    // Indices definidos a partir de las consultas reales del buscador y del panel.
    t.index(["estado", "fecha_cierre"]);
    t.index(["empresa_id", "estado"]);
    t.index(["carrera_id", "estado"]);
    t.fullText(["titulo", "descripcion"], "vacantes_busqueda_fulltext");
  });
}

export async function down(schema: SchemaFacade): Promise<void> {
  await schema.dropIfExists("vacantes");
}
