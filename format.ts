import type { Priority, Risk, Task, TaskStatus } from "./types";
import { OPEN_STATUSES } from "./types";

const todayDateOnly = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

export function isOpenTask(task: Pick<Task, "estado">) {
  return OPEN_STATUSES.includes(task.estado);
}

export function isOverdue(task: Pick<Task, "deadline" | "estado">) {
  if (!task.deadline || !isOpenTask(task)) return false;
  return new Date(`${task.deadline}T00:00:00`) < todayDateOnly();
}

export function isDueSoon(task: Pick<Task, "deadline" | "estado">) {
  if (!task.deadline || !isOpenTask(task)) return false;
  const deadline = new Date(`${task.deadline}T00:00:00`).getTime();
  const today = todayDateOnly().getTime();
  const sevenDays = today + 7 * 24 * 60 * 60 * 1000;
  return deadline >= today && deadline <= sevenDays;
}

export function dateLabel(date: string | null) {
  if (!date) return "Sin fecha";
  return new Intl.DateTimeFormat("es-UY", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit"
  }).format(new Date(`${date}T00:00:00`));
}

export function statusClass(status: TaskStatus) {
  return {
    Pendiente: "bg-amber-100 text-amber-900 border-amber-200",
    "En gestion": "bg-sky-100 text-sky-900 border-sky-200",
    "Esperando respuesta": "bg-violet-100 text-violet-900 border-violet-200",
    Resuelto: "bg-emerald-100 text-emerald-900 border-emerald-200",
    Cancelado: "bg-zinc-100 text-zinc-700 border-zinc-200",
    "No aplica": "bg-zinc-100 text-zinc-700 border-zinc-200"
  }[status];
}

export function priorityClass(priority: Priority) {
  return {
    Alta: "bg-rose-100 text-rose-900 border-rose-200",
    Media: "bg-orange-100 text-orange-900 border-orange-200",
    Baja: "bg-teal-100 text-teal-900 border-teal-200"
  }[priority];
}

export function riskClass(risk: Risk) {
  return {
    Alto: "bg-red-100 text-red-900 border-red-200",
    Medio: "bg-yellow-100 text-yellow-900 border-yellow-200",
    Bajo: "bg-lime-100 text-lime-900 border-lime-200"
  }[risk];
}

export function groupCount<T>(items: T[], label: (item: T) => string) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = label(item) || "Sin dato";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

export function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}
