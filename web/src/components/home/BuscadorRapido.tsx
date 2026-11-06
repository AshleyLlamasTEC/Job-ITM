import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import type { Catalogo, Opcion } from "@/lib/tipos";

export function BuscadorRapido() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [carrera, setCarrera] = useState("");
  const [modalidad, setModalidad] = useState("");
  const [carreras, setCarreras] = useState<Catalogo[]>([]);
  const [modalidades, setModalidades] = useState<Opcion[]>([]);

  useEffect(() => {
    let activo = true;
    Promise.all([
      api.get<Catalogo[]>("/catalogos/carreras", { publico: true }),
      api.get<Opcion[]>("/catalogos/modalidades", { publico: true }),
    ])
      .then(([c, m]) => {
        if (!activo) return;
        setCarreras(c.data);
        setModalidades(m.data);
      })
      .catch(() => undefined);
    return () => {
      activo = false;
    };
  }, []);

  const buscar = (evento: FormEvent) => {
    evento.preventDefault();
    const parametros = new URLSearchParams();
    if (q.trim()) parametros.set("q", q.trim());
    if (carrera) parametros.set("carrera_id", carrera);
    if (modalidad) parametros.set("modalidad", modalidad);
    navigate(`/vacantes?${parametros.toString()}`);
  };

  return (
    <div className="contenedor relative z-20 -mt-16 sm:-mt-20">
      <form
        onSubmit={buscar}
        className="rounded-2xl border border-blue-100 bg-white p-4 shadow-flotante sm:p-5"
      >
        <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Puesto, habilidad o palabra clave"
              className="h-12 pl-10"
              aria-label="Palabra clave"
            />
          </div>

          <div className="relative">
            <SlidersHorizontal className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-blue-400" />
            <Select
              value={carrera}
              onChange={(e) => setCarrera(e.target.value)}
              aria-label="Carrera"
              className="h-12 pl-10"
            >
              <option value="">Todas las carreras</option>
              {carreras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </div>

          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-blue-400" />
            <Select
              value={modalidad}
              onChange={(e) => setModalidad(e.target.value)}
              aria-label="Modalidad"
              className="h-12 pl-10"
            >
              <option value="">Cualquier modalidad</option>
              {modalidades.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.etiqueta}
                </option>
              ))}
            </Select>
          </div>

          <Button type="submit" size="lg" className="h-12 w-full lg:w-auto">
            <Search /> Buscar
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-semibold text-blue-700">Busquedas frecuentes:</span>
          {[
            { texto: "Practicas", a: "/vacantes?tipo=practicas" },
            { texto: "Remoto", a: "/vacantes?modalidad=remota" },
            { texto: "Sistemas", a: "/vacantes?q=sistemas" },
            { texto: "Servicio social", a: "/vacantes?tipo=servicio_social" },
          ].map((sugerencia) => (
            <button
              key={sugerencia.texto}
              type="button"
              onClick={() => navigate(sugerencia.a)}
              className="rounded-full border border-blue-100 bg-blue-50/60 px-2.5 py-1 font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
            >
              {sugerencia.texto}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
