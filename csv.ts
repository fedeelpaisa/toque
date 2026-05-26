import Papa from "papaparse";
import { csvEscape } from "./format";
import type { Profile, Task, Travel } from "./types";

export type CsvTaskRow = {
  viaje?: string;
  titulo?: string;
  descripcion?: string;
  area?: string;
  pais_o_tramo?: string;
  responsable?: string;
  estado?: string;
  prioridad?: string;
  riesgo?: string;
  deadline?: string;
  proxima_accion?: string;
  comentarios?: string;
};

export function parseTaskCsv(file: File) {
  return new Promise<CsvTaskRow[]>((resolve, reject) => {
    Papa.parse<CsvTaskRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: reject
    });
  });
}

export function exportTasksCsv(tasks: Task[]) {
  const headers = [
    "viaje",
    "titulo",
    "descripcion",
    "area",
    "pais_o_tramo",
    "responsable",
    "estado",
    "prioridad",
    "riesgo",
    "deadline",
    "proxima_accion",
    "dependencia",
    "comentarios"
  ];
  const rows = tasks.map((task) => [
    task.viaje?.nombre,
    task.titulo,
    task.descripcion,
    task.area,
    task.pais_o_tramo,
    task.responsable?.nombre,
    task.estado,
    task.prioridad,
    task.riesgo,
    task.deadline,
    task.proxima_accion,
    task.dependencia,
    task.comentarios
  ]);
  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function resolveTravelId(name: string | undefined, travels: Travel[]) {
  return travels.find((travel) => travel.nombre.toLowerCase() === name?.trim().toLowerCase())?.id ?? null;
}

export function resolveProfileId(name: string | undefined, profiles: Profile[]) {
  const normalized = name?.trim().toLowerCase();
  return profiles.find((profile) => profile.nombre.toLowerCase() === normalized || profile.email.toLowerCase() === normalized)?.id ?? null;
}
