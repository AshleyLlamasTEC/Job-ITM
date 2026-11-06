import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Aviso } from "@/components/comunes/CampoError";
import { Logo } from "@/components/layout/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthProvider";
import { api, ApiError } from "@/lib/api";
import { etiquetaRol } from "@/lib/formato";

const CUENTAS_DEMO = [
  {
    correo: "alumno@itmexicali.edu.mx",
    rol: "Alumno",
    icono: GraduationCap,
    color: "bg-blue-50 text-blue-700 border-blue-100",
  },
  {
    correo: "empresa@demo.com",
    rol: "Empresa",
    icono: Building2,
    color: "bg-sky-50 text-sky-700 border-sky-100",
  },
  {
    correo: "vinculacion@itmexicali.edu.mx",
    rol: "Vinculacion",
    icono: ShieldCheck,
    color: "bg-violet-50 text-violet-700 border-violet-100",
  },
  {
    correo: "admin@itmexicali.edu.mx",
    rol: "Admin",
    icono: BriefcaseBusiness,
    color: "bg-amber-50 text-amber-700 border-amber-100",
  },
];

export function Login() {
  const { iniciarSesion, usuario } = useAuth();
  const navigate = useNavigate();
  const [parametros] = useSearchParams();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [verContrasena, setVerContrasena] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [recuperarAbierto, setRecuperarAbierto] = useState(false);
  const [correoRecuperar, setCorreoRecuperar] = useState("");
  const [recuperando, setRecuperando] = useState(false);

  const destino = parametros.get("redirect") || "/cuenta";

  useEffect(() => {
    if (usuario) navigate(destino, { replace: true });
  }, [usuario, navigate, destino]);

  const entrar = async (evento: FormEvent) => {
    evento.preventDefault();
    setError("");
    setEnviando(true);
    try {
      const sesion = await iniciarSesion(correo.trim(), contrasena);
      toast.success(`Bienvenido, ${sesion.nombre.split(" ")[0]}.`);
      navigate(destino, { replace: true });
    } catch (fallo) {
      if (fallo instanceof ApiError) setError(fallo.message);
      else setError("No pudimos iniciar sesion. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  const usarDemo = (cuenta: (typeof CUENTAS_DEMO)[number]) => {
    setCorreo(cuenta.correo);
    setContrasena("demo1234");
    setError("");
    toast.info(`Cuenta de ${cuenta.rol} lista. Presiona "Entrar".`);
  };

  const recuperar = async (evento: FormEvent) => {
    evento.preventDefault();
    setRecuperando(true);
    try {
      await api.post(
        "/auth/recuperar",
        { correo: correoRecuperar.trim() },
        { publico: true },
      );
      toast.success("Si el correo esta registrado, recibiras un enlace de restablecimiento.");
      setRecuperarAbierto(false);
      setCorreoRecuperar("");
    } catch {
      toast.error("No pudimos procesar la solicitud. Intenta de nuevo.");
    } finally {
      setRecuperando(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Panel institucional */}
      <aside className="relative hidden overflow-hidden bg-blue-950 p-12 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#2563eb_0%,#1e3a8a_55%,#172554_100%)]" />
        <div className="absolute inset-0 fondo-cuadricula opacity-70" />
        <div className="pointer-events-none absolute -right-24 top-1/4 h-80 w-80 rounded-full bg-yellow-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-blue-600/30 blur-3xl" />

        <div className="relative">
          <Logo tono="claro" />
        </div>

        <div className="relative my-auto max-w-md py-16">
          <Badge variant="yellow" className="mb-5">
            <Sparkles className="h-3.5 w-3.5" /> Comunidad ITM
          </Badge>
          <h1 className="text-balance font-display text-4xl font-extrabold leading-[1.08] tracking-tight">
            Tu siguiente oportunidad comienza con un clic.
          </h1>
          <p className="mt-5 text-sm leading-relaxed text-blue-100/75">
            Accede a tu panel para postularte, revisar el avance de tus candidaturas o gestionar
            las vacantes de tu empresa.
          </p>

          <ul className="mt-9 space-y-4">
            {[
              "Vacantes verificadas por Vinculacion Estudiantil",
              "Postulacion en linea y seguimiento del proceso",
              "Curriculums protegidos con enlaces firmados",
            ].map((texto) => (
              <li key={texto} className="flex items-start gap-3 text-sm text-blue-100/85">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-yellow-400/15 text-yellow-400">
                  <BadgeCheck className="h-3.5 w-3.5" />
                </span>
                {texto}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-6 border-t border-white/10 pt-6 text-xs text-blue-200/60">
          <span>Tecnologico de Mexicali</span>
          <span className="h-1 w-1 rounded-full bg-blue-400" />
          <span>Vinculacion Estudiantil</span>
        </div>
      </aside>

      {/* Formulario */}
      <main className="relative flex min-h-screen flex-col bg-blue-50/40">
        <div className="flex items-center justify-between px-5 py-5 sm:px-8">
          <div className="lg:hidden">
            <Logo />
          </div>
          <Button asChild variant="ghost" size="sm" className="ml-auto text-blue-700">
            <Link to="/">
              <ArrowLeft /> Volver al inicio
            </Link>
          </Button>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-12 sm:px-8">
          <div className="w-full max-w-md">
            <div className="rounded-3xl border border-blue-100 bg-white p-7 shadow-suave sm:p-9">
              <div className="mb-7">
                <p className="etiqueta-ojo">Bienvenido de nuevo</p>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-blue-950">
                  Inicia sesion
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Usa el correo con el que registraste tu cuenta.
                </p>
              </div>

              {error && (
                <div className="mb-5">
                  <Aviso tono="error">{error}</Aviso>
                </div>
              )}

              <form onSubmit={entrar} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="correo">Correo electronico</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400" />
                    <Input
                      id="correo"
                      type="email"
                      autoComplete="email"
                      required
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                      placeholder="tu.correo@itmexicali.edu.mx"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="contrasena">Contrasena</Label>
                    <button
                      type="button"
                      onClick={() => setRecuperarAbierto(true)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                    >
                      ¿Olvidaste tu contrasena?
                    </button>
                  </div>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400" />
                    <Input
                      id="contrasena"
                      type={verContrasena ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={contrasena}
                      onChange={(e) => setContrasena(e.target.value)}
                      placeholder="Tu contrasena"
                      className="pl-10 pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setVerContrasena((v) => !v)}
                      aria-label={verContrasena ? "Ocultar contrasena" : "Mostrar contrasena"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-blue-400 transition hover:text-blue-700"
                    >
                      {verContrasena ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={enviando}>
                  {enviando ? (
                    <>
                      <Loader2 className="animate-spin" /> Entrando...
                    </>
                  ) : (
                    <>
                      Entrar <ArrowRight />
                    </>
                  )}
                </Button>
              </form>

              <p className="mt-5 text-center text-sm text-muted-foreground">
                ¿No tienes cuenta?{" "}
                <Link to="/registro" className="font-semibold text-blue-700 hover:underline">
                  Registrate aqui
                </Link>
              </p>
            </div>

            {/* Cuentas de demostracion */}
            <div className="mt-5 rounded-2xl border border-dashed border-blue-200 bg-white/60 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                  Cuentas de demostracion
                </p>
                <span className="text-[10px] text-muted-foreground">contrasena: demo1234</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {CUENTAS_DEMO.map((cuenta) => (
                  <button
                    key={cuenta.correo}
                    type="button"
                    onClick={() => usarDemo(cuenta)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition hover:-translate-y-0.5 hover:shadow-sm ${cuenta.color}`}
                  >
                    <cuenta.icono className="h-4 w-4 shrink-0" />
                    <span className="truncate">{cuenta.rol}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2.5 text-[10px] leading-relaxed text-muted-foreground">
                Elige una cuenta para llenar el formulario. Solo existen en el ambiente de
                desarrollo.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Dialog open={recuperarAbierto} onOpenChange={setRecuperarAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restablecer contrasena</DialogTitle>
            <DialogDescription>
              Escribe el correo de tu cuenta. Si esta registrado, recibiras un enlace firmado para
              crear una contrasena nueva.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={recuperar} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="correo-recuperar">Correo electronico</Label>
              <Input
                id="correo-recuperar"
                type="email"
                required
                value={correoRecuperar}
                onChange={(e) => setCorreoRecuperar(e.target.value)}
                placeholder="tu.correo@itmexicali.edu.mx"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRecuperarAbierto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={recuperando}>
                {recuperando ? <Loader2 className="animate-spin" /> : <Mail />}
                Enviar enlace
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Etiqueta de rol reutilizable en el resto de la interfaz. */
export function RolBadge({ rol }: { rol: string }) {
  return <Badge variant="suave">{etiquetaRol(rol)}</Badge>;
}
