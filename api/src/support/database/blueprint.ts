/**
 * Blueprint: el constructor de esquemas.
 *
 * Reproduce la API de las migraciones de Laravel para que el archivo de
 * migracion se lea igual que uno escrito en PHP y el SQL generado sea el mismo
 * que produciria Laravel sobre MySQL 8:
 *
 *   Schema.create("users", (t) => {
 *     t.id();
 *     t.string("correo", 150).unique();
 *     t.foreignId("carrera_id").constrained().restrictOnDelete();
 *     t.enum("estado", ["activo", "suspendido"]).default("activo");
 *     t.timestamps();
 *   });
 *
 * La clase no genera SQL por su cuenta: traduce cada definicion a una llamada
 * del constructor de Knex, que es quien arma el DDL parametrizado.
 */
import type { Knex } from "knex";

export type AccionReferencial = "cascade" | "restrict" | "set null" | "no action";

interface ReferenciaExterna {
  tabla: string;
  columna: string;
  onDelete?: AccionReferencial;
  onUpdate?: AccionReferencial;
}

/** Heuristica de Laravel: `carrera_id` apunta a la tabla `carreras`. */
function tablaDesdeColumna(columna: string): string {
  if (!columna.endsWith("_id")) {
    throw new Error(
      `No se puede deducir la tabla de la columna "${columna}". Indica la tabla explicitamente: .constrained("nombre_tabla")`,
    );
  }
  const base = columna.slice(0, -3);
  return base.endsWith("s") ? base : `${base}s`;
}

function sqlCrudo(t: Knex.CreateTableBuilder | Knex.AlterTableBuilder, sentencia: string): Knex.Raw {
  // El cliente de Knex esta disponible en el constructor pero no en su tipo publico.
  const cliente = (t as unknown as { client: Knex }).client;
  return cliente.raw(sentencia);
}

/**
 * Una columna con sus modificadores. Los metodos devuelven la misma instancia
 * para permitir el encadenamiento que usa Laravel.
 */
export class DefinicionColumna {
  public esNulable = false;
  public tieneDefault = false;
  public valorDefault: unknown = undefined;
  public esUnica = false;
  public esIndice = false;
  public esPrimaria = false;
  public esUnsigned = false;
  public esAutoIncremental = false;
  public usaCurrent = false;
  public usaCurrentOnUpdate = false;
  public referencia?: ReferenciaExterna;
  public comentario?: string;
  public despuesDe?: string;

  constructor(
    public readonly nombre: string,
    public readonly tipo: string,
    public readonly argumentos: readonly unknown[] = [],
  ) {}

  nullable(valor = true): this {
    this.esNulable = valor;
    return this;
  }

  default(valor: unknown): this {
    this.tieneDefault = true;
    this.valorDefault = valor;
    return this;
  }

  unique(): this {
    this.esUnica = true;
    return this;
  }

  index(): this {
    this.esIndice = true;
    return this;
  }

  primary(): this {
    this.esPrimaria = true;
    return this;
  }

  unsigned(): this {
    this.esUnsigned = true;
    return this;
  }

  autoIncrement(): this {
    this.esAutoIncremental = true;
    return this;
  }

  useCurrent(): this {
    this.usaCurrent = true;
    return this;
  }

  useCurrentOnUpdate(): this {
    this.usaCurrentOnUpdate = true;
    return this;
  }

  comment(texto: string): this {
    this.comentario = texto;
    return this;
  }

  after(columna: string): this {
    this.despuesDe = columna;
    return this;
  }

  /** `->constrained()` de Laravel: deduce la tabla y apunta a su llave primaria. */
  constrained(tabla?: string, columna = "id"): this {
    this.referencia = {
      tabla: tabla ?? tablaDesdeColumna(this.nombre),
      columna,
    };
    return this;
  }

  /** Variante explicita: `->references("id")->on("users")`. */
  references(columna: string): this {
    this.referencia = { tabla: this.referencia?.tabla ?? "", columna };
    return this;
  }

  on(tabla: string): this {
    if (!this.referencia) {
      this.referencia = { tabla, columna: "id" };
    } else {
      this.referencia.tabla = tabla;
    }
    return this;
  }

  onDelete(accion: AccionReferencial): this {
    if (!this.referencia) throw new Error(`La columna "${this.nombre}" no tiene referencia externa.`);
    this.referencia.onDelete = accion;
    return this;
  }

  onUpdate(accion: AccionReferencial): this {
    if (!this.referencia) throw new Error(`La columna "${this.nombre}" no tiene referencia externa.`);
    this.referencia.onUpdate = accion;
    return this;
  }

  cascadeOnDelete(): this {
    return this.onDelete("cascade");
  }

  restrictOnDelete(): this {
    return this.onDelete("restrict");
  }

  nullOnDelete(): this {
    this.esNulable = true;
    return this.onDelete("set null");
  }
}

/** Llave foranea declarada aparte, para casos compuestos: `t.foreign([...])`. */
export class DefinicionForanea {
  public columnasReferenciadas: string[] = [];
  public tablaReferenciada = "";
  public accionBorrado?: AccionReferencial;
  public accionActualizado?: AccionReferencial;

  constructor(public readonly columnas: string[]) {}

  references(columnas: string | string[]): this {
    this.columnasReferenciadas = Array.isArray(columnas) ? columnas : [columnas];
    return this;
  }

  on(tabla: string): this {
    this.tablaReferenciada = tabla;
    return this;
  }

  onDelete(accion: AccionReferencial): this {
    this.accionBorrado = accion;
    return this;
  }

  onUpdate(accion: AccionReferencial): this {
    this.accionActualizado = accion;
    return this;
  }

  cascadeOnDelete(): this {
    this.accionBorrado = "cascade";
    return this;
  }

  nullOnDelete(): this {
    this.accionBorrado = "set null";
    return this;
  }
}

type Comando =
  | { tipo: "unique"; columnas: string[]; nombre?: string }
  | { tipo: "index"; columnas: string[]; nombre?: string }
  | { tipo: "primary"; columnas: string[] }
  | { tipo: "fullText"; columnas: string[]; nombre?: string };

/**
 * Constructor de una tabla. Se usa dentro de Schema.create y Schema.table.
 */
export class Blueprint {
  public readonly columnas: DefinicionColumna[] = [];
  public readonly comandos: Comando[] = [];
  public readonly foraneas: DefinicionForanea[] = [];
  public motor = "InnoDB";
  public juegoCaracteres = "utf8mb4";
  public cotejamiento = "utf8mb4_unicode_ci";
  public comentarioTabla?: string;

  // ---------------------------------------------------------------- llaves
  id(nombre = "id"): DefinicionColumna {
    return this.bigIncrements(nombre);
  }

  bigIncrements(nombre = "id"): DefinicionColumna {
    const col = new DefinicionColumna(nombre, "bigIncrements");
    col.esUnsigned = true;
    col.esAutoIncremental = true;
    col.esPrimaria = true;
    this.columnas.push(col);
    return col;
  }

  increments(nombre = "id"): DefinicionColumna {
    const col = new DefinicionColumna(nombre, "increments");
    col.esUnsigned = true;
    col.esAutoIncremental = true;
    col.esPrimaria = true;
    this.columnas.push(col);
    return col;
  }

  // ---------------------------------------------------------------- texto
  string(nombre: string, longitud = 255): DefinicionColumna {
    return this.agregar(new DefinicionColumna(nombre, "string", [longitud]));
  }

  char(nombre: string, longitud = 255): DefinicionColumna {
    return this.agregar(new DefinicionColumna(nombre, "char", [longitud]));
  }

  text(nombre: string): DefinicionColumna {
    return this.agregar(new DefinicionColumna(nombre, "text"));
  }

  mediumText(nombre: string): DefinicionColumna {
    return this.agregar(new DefinicionColumna(nombre, "mediumText"));
  }

  longText(nombre: string): DefinicionColumna {
    return this.agregar(new DefinicionColumna(nombre, "longText"));
  }

  // --------------------------------------------------------------- numeros
  integer(nombre: string): DefinicionColumna {
    return this.agregar(new DefinicionColumna(nombre, "integer"));
  }

  tinyInteger(nombre: string): DefinicionColumna {
    return this.agregar(new DefinicionColumna(nombre, "tinyInteger"));
  }

  smallInteger(nombre: string): DefinicionColumna {
    return this.agregar(new DefinicionColumna(nombre, "smallInteger"));
  }

  mediumInteger(nombre: string): DefinicionColumna {
    return this.agregar(new DefinicionColumna(nombre, "mediumInteger"));
  }

  bigInteger(nombre: string): DefinicionColumna {
    return this.agregar(new DefinicionColumna(nombre, "bigInteger"));
  }

  unsignedBigInteger(nombre: string): DefinicionColumna {
    return this.agregar(new DefinicionColumna(nombre, "bigInteger")).unsigned();
  }

  decimal(nombre: string, total = 8, decimales = 2): DefinicionColumna {
    return this.agregar(new DefinicionColumna(nombre, "decimal", [total, decimales]));
  }

  float(nombre: string, total = 8, decimales = 2): DefinicionColumna {
    return this.agregar(new DefinicionColumna(nombre, "float", [total, decimales]));
  }

  boolean(nombre: string): DefinicionColumna {
    return this.agregar(new DefinicionColumna(nombre, "boolean"));
  }

  year(nombre: string): DefinicionColumna {
    return this.agregar(new DefinicionColumna(nombre, "year"));
  }

  // ---------------------------------------------------------------- fechas
  date(nombre: string): DefinicionColumna {
    return this.agregar(new DefinicionColumna(nombre, "date"));
  }

  dateTime(nombre: string): DefinicionColumna {
    return this.agregar(new DefinicionColumna(nombre, "dateTime"));
  }

  timestamp(nombre: string): DefinicionColumna {
    return this.agregar(new DefinicionColumna(nombre, "timestamp"));
  }

  time(nombre: string): DefinicionColumna {
    return this.agregar(new DefinicionColumna(nombre, "time"));
  }

  /**
   * Marcas de tiempo del proyecto.
   *
   * Laravel crea created_at y updated_at. Este sistema usa creado_en y
   * actualizado_en, tal como los define el diccionario de datos del diseno.
   * Ambos son NOT NULL con valor por omision, de modo que una insercion directa
   * en SQL nunca deje la fila sin fecha.
   */
  timestamps(): void {
    const creado = new DefinicionColumna("creado_en", "dateTime");
    creado.esNulable = false;
    creado.usaCurrent = true;
    this.columnas.push(creado);

    const actualizado = new DefinicionColumna("actualizado_en", "dateTime");
    actualizado.esNulable = false;
    actualizado.usaCurrent = true;
    actualizado.usaCurrentOnUpdate = true;
    this.columnas.push(actualizado);
  }

  /**
   * created_at / updated_at.
   *
   * Se usa solo en las tablas que replican un paquete de Laravel (spatie y
   * Sanctum), porque esos paquetes consultan esos nombres exactos. El resto del
   * sistema usa timestamps() con creado_en y actualizado_en.
   */
  timestampsLaravel(): void {
    const creado = new DefinicionColumna("created_at", "timestamp");
    creado.esNulable = true;
    this.columnas.push(creado);

    const actualizado = new DefinicionColumna("updated_at", "timestamp");
    actualizado.esNulable = true;
    this.columnas.push(actualizado);
  }

  // -------------------------------------------------------------- especiales
  enum(nombre: string, valores: readonly string[]): DefinicionColumna {
    return this.agregar(new DefinicionColumna(nombre, "enum", [valores]));
  }

  json(nombre: string): DefinicionColumna {
    return this.agregar(new DefinicionColumna(nombre, "json"));
  }

  uuid(nombre: string): DefinicionColumna {
    return this.agregar(new DefinicionColumna(nombre, "uuid"));
  }

  binary(nombre: string): DefinicionColumna {
    return this.agregar(new DefinicionColumna(nombre, "binary"));
  }

  // ---------------------------------------------------------------- foraneas
  foreignId(nombre: string): DefinicionColumna {
    return this.agregar(new DefinicionColumna(nombre, "bigInteger")).unsigned();
  }

  foreign(columnas: string | string[]): DefinicionForanea {
    const def = new DefinicionForanea(Array.isArray(columnas) ? columnas : [columnas]);
    this.foraneas.push(def);
    return def;
  }

  // ----------------------------------------------------------------- indices
  unique(columnas: string | string[], nombre?: string): void {
    this.comandos.push({ tipo: "unique", columnas: aLista(columnas), nombre });
  }

  index(columnas: string | string[], nombre?: string): void {
    this.comandos.push({ tipo: "index", columnas: aLista(columnas), nombre });
  }

  primary(columnas: string | string[]): void {
    this.comandos.push({ tipo: "primary", columnas: aLista(columnas) });
  }

  fullText(columnas: string | string[], nombre?: string): void {
    this.comandos.push({ tipo: "fullText", columnas: aLista(columnas), nombre });
  }

  engine(nombre: string): this {
    this.motor = nombre;
    return this;
  }

  charset(nombre: string): this {
    this.juegoCaracteres = nombre;
    return this;
  }

  collation(nombre: string): this {
    this.cotejamiento = nombre;
    return this;
  }

  comment(texto: string): this {
    this.comentarioTabla = texto;
    return this;
  }

  // ------------------------------------------------------------------ interno
  private agregar(col: DefinicionColumna): DefinicionColumna {
    this.columnas.push(col);
    return col;
  }

  /** Aplica todas las definiciones sobre el constructor de Knex. */
  compilar(t: Knex.CreateTableBuilder | Knex.AlterTableBuilder, alterando = false): void {
    if (!alterando) {
      const creador = t as Knex.CreateTableBuilder;
      creador.engine(this.motor);
      creador.charset(this.juegoCaracteres);
      creador.collate(this.cotejamiento);
      if (this.comentarioTabla) creador.comment(this.comentarioTabla);
    }

    for (const col of this.columnas) {
      aplicarColumna(t, col, alterando);
    }

    for (const col of this.columnas) {
      if (col.esUnica) t.unique([col.nombre]);
      else if (col.esIndice) t.index([col.nombre]);

      if (col.referencia) {
        if (!col.referencia.tabla) {
          throw new Error(`La llave foranea de "${col.nombre}" no indica la tabla destino.`);
        }
        const fk = t.foreign(col.nombre).references(col.referencia.columna).inTable(col.referencia.tabla);
        if (col.referencia.onDelete) fk.onDelete(col.referencia.onDelete.toUpperCase());
        if (col.referencia.onUpdate) fk.onUpdate(col.referencia.onUpdate.toUpperCase());
      }
    }

    for (const fk of this.foraneas) {
      if (!fk.tablaReferenciada) {
        throw new Error(`La llave foranea de ${fk.columnas.join(", ")} no indica la tabla destino.`);
      }
      const builder = t.foreign(fk.columnas).references(fk.columnasReferenciadas).inTable(fk.tablaReferenciada);
      if (fk.accionBorrado) builder.onDelete(fk.accionBorrado.toUpperCase());
      if (fk.accionActualizado) builder.onUpdate(fk.accionActualizado.toUpperCase());
    }

    for (const cmd of this.comandos) {
      switch (cmd.tipo) {
        case "unique":
          t.unique(cmd.columnas, cmd.nombre);
          break;
        case "index":
          t.index(cmd.columnas, cmd.nombre);
          break;
        case "primary":
          t.primary(cmd.columnas);
          break;
        case "fullText":
          t.index(cmd.columnas, cmd.nombre, "fulltext");
          break;
      }
    }
  }
}

function aLista(valor: string | string[]): string[] {
  return Array.isArray(valor) ? valor : [valor];
}

/** Traduce una DefinicionColumna a la llamada correspondiente de Knex. */
function aplicarColumna(
  t: Knex.CreateTableBuilder | Knex.AlterTableBuilder,
  col: DefinicionColumna,
  alterando: boolean,
): void {
  let b: Knex.ColumnBuilder;

  switch (col.tipo) {
    case "bigIncrements":
      b = t.bigIncrements(col.nombre);
      break;
    case "increments":
      b = t.increments(col.nombre);
      break;
    case "string":
      b = t.string(col.nombre, col.argumentos[0] as number);
      break;
    case "char":
      b = t.string(col.nombre, col.argumentos[0] as number);
      break;
    case "text":
      b = t.text(col.nombre);
      break;
    case "mediumText":
      b = t.text(col.nombre, "mediumtext");
      break;
    case "longText":
      b = t.text(col.nombre, "longtext");
      break;
    case "integer":
      b = t.integer(col.nombre);
      break;
    case "tinyInteger":
      b = t.tinyint(col.nombre);
      break;
    case "smallInteger":
      b = t.smallint(col.nombre);
      break;
    case "mediumInteger":
      b = t.integer(col.nombre);
      break;
    case "bigInteger":
      b = t.bigInteger(col.nombre);
      break;
    case "decimal":
      b = t.decimal(col.nombre, col.argumentos[0] as number, col.argumentos[1] as number);
      break;
    case "float":
      b = t.float(col.nombre, col.argumentos[0] as number, col.argumentos[1] as number);
      break;
    case "boolean":
      b = t.boolean(col.nombre);
      break;
    case "year":
      b = t.integer(col.nombre);
      break;
    case "date":
      b = t.date(col.nombre);
      break;
    case "dateTime":
      b = t.datetime(col.nombre);
      break;
    case "timestamp":
      b = t.timestamp(col.nombre);
      break;
    case "time":
      b = t.time(col.nombre);
      break;
    case "enum":
      b = t.enum(col.nombre, col.argumentos[0] as string[]);
      break;
    case "json":
      b = t.json(col.nombre);
      break;
    case "uuid":
      b = t.uuid(col.nombre);
      break;
    case "binary":
      b = t.binary(col.nombre);
      break;
    default:
      throw new Error(`Tipo de columna no soportado: ${col.tipo}`);
  }

  if (col.esUnsigned) b.unsigned();

  if (alterando) {
    if (col.esNulable) b.nullable();
    if (col.tieneDefault) b.defaultTo(col.valorDefault as never);
    if (col.usaCurrent) b.defaultTo(sqlCrudo(t, "CURRENT_TIMESTAMP") as never);
    b.alter();
    return;
  }

  if (col.esNulable) b.nullable();
  else if (!col.esPrimaria) b.notNullable();

  if (col.tieneDefault) b.defaultTo(col.valorDefault as never);
  if (col.usaCurrent) b.defaultTo(sqlCrudo(t, "CURRENT_TIMESTAMP") as never);
  if (col.usaCurrentOnUpdate) {
    b.defaultTo(sqlCrudo(t, "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP") as never);
  }
  if (col.comentario) b.comment(col.comentario);
  if (col.despuesDe) b.after(col.despuesDe);
}
