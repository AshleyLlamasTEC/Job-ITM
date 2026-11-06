import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  GraduationCap,
  Loader2,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Aviso, CampoError } from "@/components/comunes/CampoError";
import { Logo } from "@/components/layout/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthProvider";
import { api, ApiError } from "@/lib/api";
import type { Catalogo } from "@/lib/tipos";

const VACIO_ALUMNO = {
  nombre: "",
  correo: "",
  contrasena: "",
  matricula: "",
  carrera_id: "",
  semestre: "",
  telefono: "",
};

const VACIO_EMPRESA = {
  nombre: "",
  correo: "",
  contrasena: "",
  razon_social: "",
  rfc: "",
  giro: "",
  telefono: "",
  contacto_nombre: "",
  contacto_correo: "",
  sitio_web: "",
};

export function Registro() {
  const { registrarEstudiante, registrarEmpresa, usuario } = useAuth();
  const navigate = useNavigate();
  const [parametros] = useSearchParams();
  const [pestana, setPestana] = useState(parametros.get("tipo") === "empresa" ? "empresa" : "alumno");
  const [carreras, setCarreras] = useState<Catalogo[]>([]);
  const [alumno, setAlumno] = useState({ ...VACIO_ALUMNO });
  const [empresa, setEmpresa] = useState({ ...VACIO_EMPRESA });
  const [errores, setErrores] = useState<Record<string, string[]>>({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (usuario) navigate("/cuenta", { replace: true });
  }, [usuario, navigate]);

  useEffect(() => {
    api
      .get<Catalogo[]>("/catalogos/carreras", { publico: true })
      .then(({ data }) => setCarreras(data))
      .catch(() => undefined);
  }, []);

  const enviarAlumno = async (evento: FormEvent) => {
    evento.preventDefault();
    setErrores({});
    setErrorGeneral("");
    setEnviando(true);
    try {
      const respuesta = await registrarEstudiante({
        ...alumno,
        carrera_id: Number(alumno.carrera_id),
        semestre: alumno.semestre ? Number(alumno.semestre) : undefined,
        telefono: alumno.telefono || undefined,
      });
      toast.success(respuesta.mensaje ?? "Cuenta creada. Revisa tu correo para confirmarla.");
      navigate("/cuenta", { replace: true });
    } catch (fallo) {
      if (fallo instanceof ApiError) {
        setErrores(fallo.errores);
        setErrorGeneral(fallo.message);
      } else setErrorGeneral("No pudimos crear la cuenta. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  const enviarEmpresa = async (evento: FormEvent) => {
    evento.preventDefault();
    setErrores({});
    setErrorGeneral("");
    setEnviando(true);
    try {
      const respuesta = await registrarEmpresa({
        ...empresa,
        sitio_web: empresa.sitio_web || undefined,
      });
      toast.success(
        respuesta.mensaje ?? "Empresa registrada. Vinculacion revisara tu cuenta.",
      );
      navigate("/cuenta", { replace: true });
    } catch (fallo) {
      if (fallo instanceof ApiError) {
        setErrores(fallo.errores);
        setErrorGeneral(fallo.message);
      } else setErrorGeneral("No pudimos registrar la empresa. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  const cambiarAlumno = (campo: keyof typeof VACIO_ALUMNO, valor: string) =>
    setAlumno((actual) => ({ ...actual, [campo]: valor }));

  const cambiarEmpresa = (campo: keyof typeof VACIO_EMPRESA, valor: string) =>
    setEmpresa((actual) => ({ ...actual, [campo]: valor }));

  const err = (campo: string) => errores[campo]?.[0];

  return (
    <div className="min-h-screen bg-blue-50/40">
      <div className="contenedor flex h-20 items-center justify-between">
        <Logo />
        <Button asChild variant="ghost" size="sm" className="text-blue-700">
          <Link to="/">
            <ArrowLeft /> Volver al inicio
          </Link>
        </Button>
      </div>

      <div className="contenedor grid gap-10 pb-16 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <aside className="hidden lg:sticky lg:top-24 lg:block">
          <Badge variant="yellow">
            <Sparkles className="h-3.5 w-3.5" /> Registro gratuito
          </Badge>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-blue-950">
            Unete a la comunidad de talento ITM
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Crea tu cuenta en menos de dos minutos. Alumnos, egresados y empresas de la region
            comparten un mismo espacio verificado por Vinculacion Estudiantil.
          </p>

          <div className="mt-8 space-y-4">
            {[
              {
                icono: GraduationCap,
                titulo: "Alumnos y egresados",
                texto: "Sube tu CV, postulate en linea y da seguimiento a cada proceso.",
              },
              {
                icono: Building2,
                titulo: "Empresas",
                texto: "Publica vacantes y revisa candidatos desde un panel validado.",
              },
              {
                icono: ShieldCheck,
                titulo: "Cuentas protegidas",
                texto: "Validacion por correo y permisos por rol desde el primer dia.",
              },
            ].map(({ icono: Icono, titulo, texto }) => (
              <div key={titulo} className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm ring-1 ring-blue-100">
                  <Icono className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-blue-950">{titulo}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{texto}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center gap-2 rounded-xl border border-blue-100 bg-white p-3 text-xs text-muted-foreground">
            <BadgeCheck className="h-4 w-4 shrink-0 text-blue-500" />
            Ya tienes cuenta?{" "}
            <Link to="/login" className="font-semibold text-blue-700 hover:underline">
              Inicia sesion
            </Link>
          </div>
        </aside>

        <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-suave sm:p-8">
          <Tabs value={pestana} onValueChange={setPestana}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="alumno">
                <UserRound /> Soy alumno
              </TabsTrigger>
              <TabsTrigger value="empresa">
                <Building2 /> Soy empresa
              </TabsTrigger>
            </TabsList>

            <TabsContent value="alumno">
              <div className="mb-5 mt-2">
                <h2 className="text-xl font-extrabold text-blue-950">Datos del estudiante</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Usa tu correo institucional para que Vinculacion pueda identificarte.
                </p>
              </div>

              {errorGeneral && (
                <div className="mb-4">
                  <Aviso tono="error">{errorGeneral}</Aviso>
                </div>
              )}

              <form onSubmit={enviarAlumno} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="a-nombre">Nombre completo</Label>
                    <Input
                      id="a-nombre"
                      required
                      value={alumno.nombre}
                      onChange={(e) => cambiarAlumno("nombre", e.target.value)}
                      placeholder="Ana Maria Lopez"
                    />
                    <CampoError>{err("nombre")}</CampoError>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="a-correo">Correo institucional</Label>
                    <Input
                      id="a-correo"
                      type="email"
                      required
                      value={alumno.correo}
                      onChange={(e) => cambiarAlumno("correo", e.target.value)}
                      placeholder="ana.lopez@itmexicali.edu.mx"
                    />
                    <CampoError>{err("correo")}</CampoError>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="a-matricula">Matricula</Label>
                    <Input
                      id="a-matricula"
                      required
                      value={alumno.matricula}
                      onChange={(e) => cambiarAlumno("matricula", e.target.value)}
                      placeholder="20301234"
                    />
                    <CampoError>{err("matricula")}</CampoError>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="a-carrera">Carrera</Label>
                    <Select
                      id="a-carrera"
                      required
                      value={alumno.carrera_id}
                      onChange={(e) => cambiarAlumno("carrera_id", e.target.value)}
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
                    <Label htmlFor="a-semestre">Semestre</Label>
                    <Select
                      id="a-semestre"
                      value={alumno.semestre}
                      onChange={(e) => cambiarAlumno("semestre", e.target.value)}
                    >
                      <option value="">Selecciona</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}° semestre
                        </option>
                      ))}
                    </Select>
                    <CampoError>{err("semestre")}</CampoError>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="a-telefono">Telefono (opcional)</Label>
                    <Input
                      id="a-telefono"
                      value={alumno.telefono}
                      onChange={(e) => cambiarAlumno("telefono", e.target.value)}
                      placeholder="6861234567"
                    />
                    <CampoError>{err("telefono")}</CampoError>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="a-contrasena">Contrasena</Label>
                    <Input
                      id="a-contrasena"
                      type="password"
                      required
                      minLength={8}
                      value={alumno.contrasena}
                      onChange={(e) => cambiarAlumno("contrasena", e.target.value)}
                      placeholder="Minimo 8 caracteres"
                    />
                    <CampoError>{err("contrasena")}</CampoError>
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={enviando}>
                  {enviando ? <Loader2 className="animate-spin" /> : <GraduationCap />}
                  Crear cuenta de alumno
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="empresa">
              <div className="mb-5 mt-2">
                <h2 className="text-xl font-extrabold text-blue-950">Datos de la empresa</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tu cuenta quedara pendiente hasta que Vinculacion valide la informacion.
                </p>
              </div>

              {errorGeneral && (
                <div className="mb-4">
                  <Aviso tono="error">{errorGeneral}</Aviso>
                </div>
              )}

              <form onSubmit={enviarEmpresa} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="e-razon">Razon social</Label>
                    <Input
                      id="e-razon"
                      required
                      value={empresa.razon_social}
                      onChange={(e) => cambiarEmpresa("razon_social", e.target.value)}
                      placeholder="Grupo Industrial del Valle S.A. de C.V."
                    />
                    <CampoError>{err("razon_social")}</CampoError>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="e-rfc">RFC</Label>
                    <Input
                      id="e-rfc"
                      required
                      maxLength={13}
                      value={empresa.rfc}
                      onChange={(e) => cambiarEmpresa("rfc", e.target.value.toUpperCase())}
                      placeholder="GIV200101AB1"
                    />
                    <CampoError>{err("rfc")}</CampoError>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="e-giro">Giro</Label>
                    <Input
                      id="e-giro"
                      required
                      value={empresa.giro}
                      onChange={(e) => cambiarEmpresa("giro", e.target.value)}
                      placeholder="Manufactura, software, comercio..."
                    />
                    <CampoError>{err("giro")}</CampoError>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="e-nombre">Nombre del responsable</Label>
                    <Input
                      id="e-nombre"
                      required
                      value={empresa.nombre}
                      onChange={(e) => cambiarEmpresa("nombre", e.target.value)}
                      placeholder="Laura Mendoza"
                    />
                    <CampoError>{err("nombre")}</CampoError>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="e-correo">Correo de acceso</Label>
                    <Input
                      id="e-correo"
                      type="email"
                      required
                      value={empresa.correo}
                      onChange={(e) => cambiarEmpresa("correo", e.target.value)}
                      placeholder="rrhh@tuempresa.com"
                    />
                    <CampoError>{err("correo")}</CampoError>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="e-telefono">Telefono</Label>
                    <Input
                      id="e-telefono"
                      required
                      value={empresa.telefono}
                      onChange={(e) => cambiarEmpresa("telefono", e.target.value)}
                      placeholder="6861234567"
                    />
                    <CampoError>{err("telefono")}</CampoError>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="e-sitio">Sitio web (opcional)</Label>
                    <Input
                      id="e-sitio"
                      value={empresa.sitio_web}
                      onChange={(e) => cambiarEmpresa("sitio_web", e.target.value)}
                      placeholder="https://tuempresa.com"
                    />
                    <CampoError>{err("sitio_web")}</CampoError>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="e-contacto">Nombre de contacto</Label>
                    <Input
                      id="e-contacto"
                      required
                      value={empresa.contacto_nombre}
                      onChange={(e) => cambiarEmpresa("contacto_nombre", e.target.value)}
                      placeholder="Laura Mendoza"
                    />
                    <CampoError>{err("contacto_nombre")}</CampoError>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="e-contacto-correo">Correo de contacto</Label>
                    <Input
                      id="e-contacto-correo"
                      type="email"
                      required
                      value={empresa.contacto_correo}
                      onChange={(e) => cambiarEmpresa("contacto_correo", e.target.value)}
                      placeholder="rrhh@tuempresa.com"
                    />
                    <CampoError>{err("contacto_correo")}</CampoError>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="e-contrasena">Contrasena</Label>
                    <Input
                      id="e-contrasena"
                      type="password"
                      required
                      minLength={8}
                      value={empresa.contrasena}
                      onChange={(e) => cambiarEmpresa("contrasena", e.target.value)}
                      placeholder="Minimo 8 caracteres"
                    />
                    <CampoError>{err("contrasena")}</CampoError>
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={enviando}>
                  {enviando ? <Loader2 className="animate-spin" /> : <Building2 />}
                  Registrar empresa
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-center text-xs text-muted-foreground lg:hidden">
            Ya tienes cuenta?{" "}
            <Link to="/login" className="font-semibold text-blue-700 hover:underline">
              Inicia sesion
            </Link>
          </p>
        </div>
      </div>

      <p className="pb-10 text-center text-xs text-muted-foreground">
        Al registrarte aceptas el uso de tus datos para fines de vinculacion laboral.{" "}
        <Link to="/" className="font-semibold text-blue-700 hover:underline">
          Conocer mas
        </Link>
      </p>
    </div>
  );
}
