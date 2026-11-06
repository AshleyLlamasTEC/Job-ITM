import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  BadgeCheck,
  Building2,
  Download,
  FileText,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  Upload,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Aviso, CampoError } from "@/components/comunes/CampoError";
import { CabeceraPanel } from "@/components/layout/UserLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthProvider";
import { api, ApiError } from "@/lib/api";
import { fecha } from "@/lib/formato";
import { iniciales } from "@/lib/utils";
import type { Catalogo, PerfilEmpresa, PerfilEstudiante } from "@/lib/tipos";

const VACIO_ESTUDIANTE = {
  nombre: "",
  carrera_id: "",
  semestre: "",
  anio_egreso: "",
  telefono: "",
  habilidades: "",
};

const VACIO_EMPRESA = {
  nombre: "",
  razon_social: "",
  giro: "",
  sitio_web: "",
  telefono: "",
  contacto_nombre: "",
  contacto_correo: "",
};

export function Perfil() {
  const { usuario } = useAuth();

  if (!usuario) return null;

  return usuario.rol === "empresa" ? <PerfilEmpresaVista /> : <PerfilEstudianteVista />;
}

/* ------------------------------------------------------------------ alumno */

function PerfilEstudianteVista() {
  const { usuario, refrescar } = useAuth();
  const perfil = usuario?.perfil as PerfilEstudiante | null | undefined;

  const [formulario, setFormulario] = useState({ ...VACIO_ESTUDIANTE });
  const [carreras, setCarreras] = useState<Catalogo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string[]>>({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [subiendoCv, setSubiendoCv] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const archivoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let activo = true;
    Promise.all([
      api.get<PerfilEstudiante>("/perfil"),
      api.get<Catalogo[]>("/catalogos/carreras", { publico: true }),
    ])
      .then(([p, c]) => {
        if (!activo) return;
        const datos = p.data;
        setFormulario({
          nombre: usuario?.nombre ?? "",
          carrera_id: datos.carrera_id ? String(datos.carrera_id) : "",
          semestre: datos.semestre ? String(datos.semestre) : "",
          anio_egreso: datos.anio_egreso ? String(datos.anio_egreso) : "",
          telefono: datos.telefono ?? "",
          habilidades: datos.habilidades ?? "",
        });
        setCarreras(c.data);
      })
      .catch((fallo) => {
        if (activo) {
          setErrorGeneral(
            fallo instanceof ApiError ? fallo.message : "No pudimos cargar tu perfil.",
          );
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
    // `usuario.nombre` solo se usa como valor inicial del formulario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cambiar = (campo: keyof typeof VACIO_ESTUDIANTE, valor: string) => {
    setFormulario((actual) => {
      const copia = { ...actual, [campo]: valor };
      // Semestre y anio de egreso son excluyentes en la API.
      if (campo === "semestre" && valor) copia.anio_egreso = "";
      if (campo === "anio_egreso" && valor) copia.semestre = "";
      return copia;
    });
  };

  const guardar = async (evento: FormEvent) => {
    evento.preventDefault();
    setErrores({});
    setErrorGeneral("");
    setGuardando(true);
    try {
      await api.put("/perfil", {
        nombre: formulario.nombre.trim(),
        carrera_id: formulario.carrera_id ? Number(formulario.carrera_id) : null,
        semestre: formulario.semestre ? Number(formulario.semestre) : null,
        anio_egreso: formulario.anio_egreso ? Number(formulario.anio_egreso) : null,
        telefono: formulario.telefono.trim() || null,
        habilidades: formulario.habilidades.trim() || null,
      });
      await refrescar();
      toast.success("Perfil actualizado.");
    } catch (fallo) {
      if (fallo instanceof ApiError) {
        setErrores(fallo.errores);
        setErrorGeneral(fallo.message);
      } else setErrorGeneral("No pudimos guardar los cambios.");
    } finally {
      setGuardando(false);
    }
  };

  const subirCv = async (archivo: File) => {
    setSubiendoCv(true);
    try {
      const datos = new FormData();
      datos.append("cv", archivo);
      await api.post("/perfil/cv", datos);
      await refrescar();
      toast.success("Curriculum cargado correctamente.");
    } catch (fallo) {
      toast.error(
        fallo instanceof ApiError ? fallo.message : "No pudimos subir tu curriculum.",
      );
    } finally {
      setSubiendoCv(false);
      if (archivoRef.current) archivoRef.current.value = "";
    }
  };

  const descargarCv = async () => {
    setDescargando(true);
    try {
      const { data } = await api.get<{ url: string; expira: number }>("/perfil/cv");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (fallo) {
      toast.error(fallo instanceof ApiError ? fallo.message : "No pudimos abrir tu CV.");
    } finally {
      setDescargando(false);
    }
  };

  const err = (campo: string) => errores[campo]?.[0];

  if (cargando) {
    return (
      <>
        <CabeceraPanel titulo="Mi perfil" descripcion="Cargando tus datos..." />
        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    );
  }

  return (
    <>
      <CabeceraPanel
        titulo="Mi perfil"
        descripcion="Un perfil completo ayuda a que las empresas encuentren tu talento."
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-suave sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
              <UserRound className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-blue-950">Datos academicos</h2>
              <p className="text-xs text-muted-foreground">
                Esta informacion se comparte con las empresas al postularte.
              </p>
            </div>
          </div>

          {errorGeneral && (
            <div className="mt-5">
              <Aviso tono="error">{errorGeneral}</Aviso>
            </div>
          )}

          <form onSubmit={guardar} className="mt-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="p-nombre">Nombre completo</Label>
                <Input
                  id="p-nombre"
                  value={formulario.nombre}
                  onChange={(e) => cambiar("nombre", e.target.value)}
                  maxLength={120}
                />
                <CampoError>{err("nombre")}</CampoError>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-matricula">Matricula</Label>
                <Input id="p-matricula" value={perfil?.matricula ?? ""} disabled />
                <p className="text-[11px] text-muted-foreground">
                  La matricula la asigna Vinculacion; no se edita aqui.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-carrera">Carrera</Label>
                <Select
                  id="p-carrera"
                  value={formulario.carrera_id}
                  onChange={(e) => cambiar("carrera_id", e.target.value)}
                >
                  <option value="">Selecciona tu carrera</option>
                  {carreras.map((carrera) => (
                    <option key={carrera.id} value={carrera.id}>
                      {carrera.nombre}
                    </option>
                  ))}
                </Select>
                <CampoError>{err("carrera_id")}</CampoError>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-semestre">Semestre actual</Label>
                <Select
                  id="p-semestre"
                  value={formulario.semestre}
                  onChange={(e) => cambiar("semestre", e.target.value)}
                >
                  <option value="">No aplica / egresado</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}° semestre
                    </option>
                  ))}
                </Select>
                <CampoError>{err("semestre")}</CampoError>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-egreso">Anio de egreso</Label>
                <Select
                  id="p-egreso"
                  value={formulario.anio_egreso}
                  onChange={(e) => cambiar("anio_egreso", e.target.value)}
                >
                  <option value="">Aun estudio</option>
                  {Array.from({ length: 12 }, (_, i) => new Date().getFullYear() - i).map(
                    (anio) => (
                      <option key={anio} value={anio}>
                        {anio}
                      </option>
                    ),
                  )}
                </Select>
                <CampoError>{err("anio_egreso")}</CampoError>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-telefono">Telefono</Label>
                <Input
                  id="p-telefono"
                  value={formulario.telefono}
                  onChange={(e) => cambiar("telefono", e.target.value)}
                  placeholder="6861234567"
                  maxLength={15}
                />
                <CampoError>{err("telefono")}</CampoError>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="p-habilidades">Habilidades</Label>
                <Textarea
                  id="p-habilidades"
                  value={formulario.habilidades}
                  onChange={(e) => cambiar("habilidades", e.target.value)}
                  maxLength={400}
                  placeholder="Herramientas, lenguajes, certificaciones y areas donde destacas."
                />
                <div className="flex justify-between">
                  <CampoError>{err("habilidades")}</CampoError>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {formulario.habilidades.length}/400
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button type="submit" disabled={guardando}>
                {guardando ? <Loader2 className="animate-spin" /> : <BadgeCheck />}
                Guardar cambios
              </Button>
            </div>
          </form>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-suave">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-blue-950">Curriculum</h2>
                <p className="text-xs text-muted-foreground">Formato PDF, maximo 5 MB.</p>
              </div>
            </div>

            {perfil?.cv_ruta ? (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                  <BadgeCheck className="h-4 w-4" /> CV cargado
                </p>
                <p className="mt-1 text-[11px] text-emerald-700">
                  Actualizado {fecha(perfil.cv_actualizado_en)}
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <ShieldAlert className="h-4 w-4" /> Aun no subes tu CV
                </p>
                <p className="mt-1 text-[11px] text-amber-700">
                  Necesitas un CV para postularte a las vacantes.
                </p>
              </div>
            )}

            <input
              ref={archivoRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const archivo = e.target.files?.[0];
                if (archivo) void subirCv(archivo);
              }}
            />

            <div className="mt-4 grid gap-2">
              <Button
                type="button"
                variant={perfil?.cv_ruta ? "outline" : "default"}
                onClick={() => archivoRef.current?.click()}
                disabled={subiendoCv}
              >
                {subiendoCv ? <Loader2 className="animate-spin" /> : <Upload />}
                {perfil?.cv_ruta ? "Reemplazar CV" : "Subir mi CV"}
              </Button>
              {perfil?.cv_ruta && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void descargarCv()}
                  disabled={descargando}
                >
                  {descargando ? <Loader2 className="animate-spin" /> : <Download />}
                  Descargar CV
                </Button>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
            <p className="text-xs font-bold text-blue-800">Privacidad de tus datos</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              Tu curriculum solo lo consultan las empresas a las que te postulas y el personal de
              Vinculacion. Las descargas usan enlaces firmados que vencen en cinco minutos.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}

/* ----------------------------------------------------------------- empresa */

function PerfilEmpresaVista() {
  const { usuario, refrescar } = useAuth();
  const perfil = usuario?.perfil as PerfilEmpresa | null | undefined;

  const [formulario, setFormulario] = useState({ ...VACIO_EMPRESA });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string[]>>({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let activo = true;
    api
      .get<PerfilEmpresa>("/empresa/perfil")
      .then(({ data }) => {
        if (!activo) return;
        setFormulario({
          nombre: usuario?.nombre ?? "",
          razon_social: data.razon_social ?? "",
          giro: data.giro ?? "",
          sitio_web: data.sitio_web ?? "",
          telefono: data.telefono ?? "",
          contacto_nombre: data.contacto_nombre ?? "",
          contacto_correo: data.contacto_correo ?? "",
        });
      })
      .catch((fallo) => {
        if (activo) {
          setErrorGeneral(
            fallo instanceof ApiError ? fallo.message : "No pudimos cargar el perfil de empresa.",
          );
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cambiar = (campo: keyof typeof VACIO_EMPRESA, valor: string) =>
    setFormulario((actual) => ({ ...actual, [campo]: valor }));

  const guardar = async (evento: FormEvent) => {
    evento.preventDefault();
    setErrores({});
    setErrorGeneral("");
    setGuardando(true);
    try {
      await api.put("/empresa/perfil", {
        nombre: formulario.nombre.trim(),
        razon_social: formulario.razon_social.trim(),
        giro: formulario.giro.trim() || null,
        sitio_web: formulario.sitio_web.trim() || null,
        telefono: formulario.telefono.trim() || null,
        contacto_nombre: formulario.contacto_nombre.trim() || null,
        contacto_correo: formulario.contacto_correo.trim() || null,
      });
      await refrescar();
      toast.success("Datos de la empresa actualizados.");
    } catch (fallo) {
      if (fallo instanceof ApiError) {
        setErrores(fallo.errores);
        setErrorGeneral(fallo.message);
      } else setErrorGeneral("No pudimos guardar los cambios.");
    } finally {
      setGuardando(false);
    }
  };

  const subirLogo = async (archivo: File) => {
    setSubiendoLogo(true);
    setVistaPrevia(URL.createObjectURL(archivo));
    try {
      const datos = new FormData();
      datos.append("logo", archivo);
      await api.post("/empresa/perfil/logo", datos);
      await refrescar();
      toast.success("Logo actualizado.");
    } catch (fallo) {
      setVistaPrevia(null);
      toast.error(fallo instanceof ApiError ? fallo.message : "No pudimos subir el logo.");
    } finally {
      setSubiendoLogo(false);
      if (logoRef.current) logoRef.current.value = "";
    }
  };

  const err = (campo: string) => errores[campo]?.[0];

  if (cargando) {
    return (
      <>
        <CabeceraPanel titulo="Mi empresa" descripcion="Cargando los datos de tu organizacion..." />
        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    );
  }

  const aprobada = perfil?.estatus_validacion === "aprobada";

  return (
    <>
      <CabeceraPanel
        titulo="Mi empresa"
        descripcion="Los datos de contacto se muestran a los alumnos en tus vacantes."
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-suave sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-blue-950">Datos de la organizacion</h2>
              <p className="text-xs text-muted-foreground">
                El RFC y el estatus de validacion los controla Vinculacion.
              </p>
            </div>
          </div>

          {perfil?.estatus_validacion === "rechazada" && (
            <div className="mt-5">
              <Aviso tono="error">
                <p className="font-semibold">Tu empresa fue rechazada.</p>
                {perfil.motivo_rechazo && <p className="mt-1">{perfil.motivo_rechazo}</p>}
                <p className="mt-1 text-xs">
                  Corrige los datos y guarda: la cuenta volvera a quedar pendiente de revision.
                </p>
              </Aviso>
            </div>
          )}

          {errorGeneral && (
            <div className="mt-5">
              <Aviso tono="error">{errorGeneral}</Aviso>
            </div>
          )}

          <form onSubmit={guardar} className="mt-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="e-razon">Razon social</Label>
                <Input
                  id="e-razon"
                  value={formulario.razon_social}
                  onChange={(e) => cambiar("razon_social", e.target.value)}
                  maxLength={160}
                />
                <CampoError>{err("razon_social")}</CampoError>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="e-rfc">RFC</Label>
                <Input id="e-rfc" value={perfil?.rfc ?? ""} disabled />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="e-nombre">Nombre del responsable</Label>
                <Input
                  id="e-nombre"
                  value={formulario.nombre}
                  onChange={(e) => cambiar("nombre", e.target.value)}
                  maxLength={120}
                />
                <CampoError>{err("nombre")}</CampoError>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="e-giro">Giro</Label>
                <Input
                  id="e-giro"
                  value={formulario.giro}
                  onChange={(e) => cambiar("giro", e.target.value)}
                  maxLength={80}
                  placeholder="Manufactura, software, comercio..."
                />
                <CampoError>{err("giro")}</CampoError>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="e-telefono">Telefono</Label>
                <Input
                  id="e-telefono"
                  value={formulario.telefono}
                  onChange={(e) => cambiar("telefono", e.target.value)}
                  maxLength={15}
                />
                <CampoError>{err("telefono")}</CampoError>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="e-sitio">Sitio web</Label>
                <Input
                  id="e-sitio"
                  value={formulario.sitio_web}
                  onChange={(e) => cambiar("sitio_web", e.target.value)}
                  maxLength={120}
                  placeholder="https://tuempresa.com"
                />
                <CampoError>{err("sitio_web")}</CampoError>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="e-contacto">Contacto</Label>
                <Input
                  id="e-contacto"
                  value={formulario.contacto_nombre}
                  onChange={(e) => cambiar("contacto_nombre", e.target.value)}
                  maxLength={120}
                />
                <CampoError>{err("contacto_nombre")}</CampoError>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="e-contacto-correo">Correo de contacto</Label>
                <Input
                  id="e-contacto-correo"
                  type="email"
                  value={formulario.contacto_correo}
                  onChange={(e) => cambiar("contacto_correo", e.target.value)}
                  maxLength={150}
                />
                <CampoError>{err("contacto_correo")}</CampoError>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button type="submit" disabled={guardando}>
                {guardando ? <Loader2 className="animate-spin" /> : <BadgeCheck />}
                Guardar cambios
              </Button>
            </div>
          </form>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-suave">
            <h2 className="text-base font-bold text-blue-950">Logo de la empresa</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">PNG o JPG, maximo 2 MB.</p>

            <div className="mt-5 flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-100 to-blue-50 text-2xl font-extrabold text-blue-700">
              {vistaPrevia ? (
                <img
                  src={vistaPrevia}
                  alt="Vista previa del logo"
                  className="h-full w-full object-cover"
                />
              ) : (
                iniciales(perfil?.razon_social ?? usuario?.nombre)
              )}
            </div>

            <input
              ref={logoRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                const archivo = e.target.files?.[0];
                if (archivo) void subirLogo(archivo);
              }}
            />

            <Button
              type="button"
              variant="outline"
              className="mt-4 w-full"
              onClick={() => logoRef.current?.click()}
              disabled={subiendoLogo}
            >
              {subiendoLogo ? <Loader2 className="animate-spin" /> : <Upload />}
              Subir logo
            </Button>
          </section>

          <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-suave">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-blue-950">Validacion</h2>
              <Badge variant={aprobada ? "yellow" : "suave"}>
                {perfil?.estatus_validacion ?? "pendiente"}
              </Badge>
            </div>

            <ul className="mt-4 space-y-2.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-blue-400" /> {usuario?.correo}
              </li>
              {formulario.telefono && (
                <li className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-blue-400" /> {formulario.telefono}
                </li>
              )}
              {formulario.sitio_web && (
                <li className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-blue-400" /> {formulario.sitio_web}
                </li>
              )}
              <li className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-blue-400" /> Mexicali, Baja California
              </li>
            </ul>

            {aprobada ? (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-[11px] leading-relaxed text-emerald-800">
                <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Tu empresa esta validada. Tus vacantes pasan a moderacion antes de publicarse.
              </p>
            ) : (
              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">
                Vinculacion revisa tu informacion. Mientras tanto puedes preparar tus vacantes.
              </p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
