export type UserRole = "Admin" | "Coordinador" | "Operativo" | "Solo lectura";
export type TravelStatus = "Activo" | "Planificacion" | "Finalizado" | "Pausado";
export type TaskStatus =
  | "Pendiente"
  | "En gestion"
  | "Esperando respuesta"
  | "Resuelto"
  | "Cancelado"
  | "No aplica";
export type Priority = "Alta" | "Media" | "Baja";
export type Risk = "Alto" | "Medio" | "Bajo";
export type Area =
  | "Vuelos"
  | "Alojamiento"
  | "Transporte"
  | "Comidas"
  | "Entradas"
  | "Guias"
  | "Seguros"
  | "Documentacion"
  | "Kits"
  | "Comunicacion"
  | "Pagos"
  | "Proveedores"
  | "Otros";

export type Profile = {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  activo: boolean;
};

export type Travel = {
  id: string;
  nombre: string;
  temporada: string | null;
  destino_principal: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: TravelStatus;
  comentarios: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Task = {
  id: string;
  viaje_id: string | null;
  titulo: string;
  descripcion: string | null;
  area: Area;
  pais_o_tramo: string | null;
  responsable_id: string | null;
  estado: TaskStatus;
  prioridad: Priority;
  riesgo: Risk;
  deadline: string | null;
  proxima_accion: string | null;
  dependencia: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
  creado_por: string | null;
  comentarios: string | null;
  viaje?: Pick<Travel, "id" | "nombre"> | null;
  responsable?: Pick<Profile, "id" | "nombre" | "email"> | null;
};

export type TaskComment = {
  id: string;
  tarea_id: string;
  usuario_id: string | null;
  comentario: string;
  fecha_creacion: string;
  usuario?: Pick<Profile, "nombre" | "email"> | null;
};

export const TASK_STATUSES: TaskStatus[] = [
  "Pendiente",
  "En gestion",
  "Esperando respuesta",
  "Resuelto",
  "Cancelado",
  "No aplica"
];

export const KANBAN_COLUMNS: Array<{ title: string; statuses: TaskStatus[] }> = [
  { title: "Pendiente", statuses: ["Pendiente"] },
  { title: "En gestion", statuses: ["En gestion"] },
  { title: "Esperando respuesta", statuses: ["Esperando respuesta"] },
  { title: "Resuelto", statuses: ["Resuelto"] },
  { title: "Cancelado / No aplica", statuses: ["Cancelado", "No aplica"] }
];

export const PRIORITIES: Priority[] = ["Alta", "Media", "Baja"];
export const RISKS: Risk[] = ["Alto", "Medio", "Bajo"];
export const AREAS: Area[] = [
  "Vuelos",
  "Alojamiento",
  "Transporte",
  "Comidas",
  "Entradas",
  "Guias",
  "Seguros",
  "Documentacion",
  "Kits",
  "Comunicacion",
  "Pagos",
  "Proveedores",
  "Otros"
];

export const OPEN_STATUSES: TaskStatus[] = [
  "Pendiente",
  "En gestion",
  "Esperando respuesta"
];
