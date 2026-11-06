import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { api, ApiError, guardarToken, leerToken } from "@/lib/api";
import type { Rol, Usuario } from "@/lib/tipos";

interface SesionRespuesta {
  usuario: Usuario;
  token: string;
  mensaje?: string;
}

interface AuthContexto {
  usuario: Usuario | null;
  cargando: boolean;
  iniciarSesion: (correo: string, contrasena: string) => Promise<Usuario>;
  registrarEstudiante: (datos: Record<string, unknown>) => Promise<SesionRespuesta>;
  registrarEmpresa: (datos: Record<string, unknown>) => Promise<SesionRespuesta>;
  cerrarSesion: () => Promise<void>;
  refrescar: () => Promise<void>;
  tienePermiso: (permiso: string) => boolean;
  esRol: (...roles: Rol[]) => boolean;
}

const Contexto = createContext<AuthContexto | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  const refrescar = useCallback(async () => {
    if (!leerToken()) {
      setUsuario(null);
      setCargando(false);
      return;
    }
    try {
      const { data } = await api.get<Usuario>("/auth/yo");
      setUsuario(data);
    } catch (error) {
      if (error instanceof ApiError && (error.estado === 401 || error.estado === 403)) {
        guardarToken(null);
      }
      setUsuario(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void refrescar();
  }, [refrescar]);

  const iniciarSesion = useCallback(async (correo: string, contrasena: string) => {
    const { data } = await api.post<SesionRespuesta>(
      "/auth/login",
      { correo, contrasena, dispositivo: "web" },
      { publico: true },
    );
    guardarToken(data.token);
    setUsuario(data.usuario);
    // El login devuelve la cuenta sin el perfil academico o de empresa; se
    // consulta /auth/yo para que el panel tenga los datos completos.
    await refrescar();
    return data.usuario;
  }, [refrescar]);

  const registrarEstudiante = useCallback(async (datos: Record<string, unknown>) => {
    const { data } = await api.post<SesionRespuesta>("/auth/registro-estudiante", datos, {
      publico: true,
    });
    guardarToken(data.token);
    await refrescar();
    return data;
  }, [refrescar]);

  const registrarEmpresa = useCallback(async (datos: Record<string, unknown>) => {
    const { data } = await api.post<SesionRespuesta>("/auth/registro-empresa", datos, {
      publico: true,
    });
    guardarToken(data.token);
    await refrescar();
    return data;
  }, [refrescar]);

  const cerrarSesion = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* el token pudo vencer: de todos modos se limpia la sesion local */
    }
    guardarToken(null);
    setUsuario(null);
  }, []);

  const valor = useMemo<AuthContexto>(
    () => ({
      usuario,
      cargando,
      iniciarSesion,
      registrarEstudiante,
      registrarEmpresa,
      cerrarSesion,
      refrescar,
      tienePermiso: (permiso) =>
        usuario?.rol === "admin_tecnico" || Boolean(usuario?.permisos?.includes(permiso)),
      esRol: (...roles) => Boolean(usuario && roles.includes(usuario.rol)),
    }),
    [usuario, cargando, iniciarSesion, registrarEstudiante, registrarEmpresa, cerrarSesion, refrescar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth(): AuthContexto {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return contexto;
}
