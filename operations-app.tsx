"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Check,
  Columns3,
  Download,
  LayoutDashboard,
  ListFilter,
  LogOut,
  MessageSquare,
  Plus,
  Search,
  Upload,
  X
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  AREAS,
  KANBAN_COLUMNS,
  PRIORITIES,
  RISKS,
  TASK_STATUSES,
  type Area,
  type Priority,
  type Profile,
  type Risk,
  type Task,
  type TaskComment,
  type TaskStatus,
  type Travel
} from "@/lib/types";
import { dateLabel, groupCount, isDueSoon, isOpenTask, isOverdue, priorityClass, riskClass, statusClass } from "@/lib/format";
import { downloadCsv, exportTasksCsv, parseTaskCsv, resolveProfileId, resolveTravelId } from "@/lib/csv";

type View = "dashboard" | "table" | "kanban" | "travels";
type TaskDraft = {
  id?: string;
  viaje_id: string;
  titulo: string;
  descripcion: string;
  area: Area;
  pais_o_tramo: string;
  responsable_id: string;
  estado: TaskStatus;
  prioridad: Priority;
  riesgo: Risk;
  deadline: string;
  proxima_accion: string;
  dependencia: string;
  comentarios: string;
};

const emptyTask: TaskDraft = {
  viaje_id: "",
  titulo: "",
  descripcion: "",
  area: "Otros",
  pais_o_tramo: "",
  responsable_id: "",
  estado: "Pendiente",
  prioridad: "Media",
  riesgo: "Medio",
  deadline: "",
  proxima_accion: "",
  dependencia: "",
  comentarios: ""
};

export function OperationsApp({ initialView }: { initialView: View }) {
  const [view, setView] = useState<View>(initialView);
  const [sessionReady, setSessionReady] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [travels, setTravels] = useState<Travel[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState({
    viaje: "",
    responsable: "",
    area: "",
    estado: "",
    prioridad: "",
    riesgo: "",
    deadline: "",
    search: "",
    includeResolved: false,
    sort: "deadline"
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        window.location.href = "/login";
        return;
      }
      setCurrentUserId(data.session.user.id);
      setSessionReady(true);
      void loadAll();
    });
  }, []);

  async function loadAll() {
    const [taskResult, travelResult, profileResult] = await Promise.all([
      supabase
        .from("tareas")
        .select("*, viaje:viajes(id,nombre), responsable:profiles(id,nombre,email)")
        .order("deadline", { ascending: true, nullsFirst: false }),
      supabase.from("viajes").select("*").order("fecha_inicio", { ascending: true, nullsFirst: false }),
      supabase.from("profiles").select("*").eq("activo", true).order("nombre")
    ]);
    if (taskResult.error || travelResult.error || profileResult.error) {
      setMessage(taskResult.error?.message ?? travelResult.error?.message ?? profileResult.error?.message ?? "Error al cargar datos");
      return;
    }
    setTasks(taskResult.data as Task[]);
    setTravels(travelResult.data as Travel[]);
    setProfiles(profileResult.data as Profile[]);
  }

  const filteredTasks = useMemo(() => {
    const search = filters.search.toLowerCase();
    return tasks
      .filter((task) => filters.includeResolved || isOpenTask(task))
      .filter((task) => !filters.viaje || task.viaje_id === filters.viaje)
      .filter((task) => !filters.responsable || task.responsable_id === filters.responsable)
      .filter((task) => !filters.area || task.area === filters.area)
      .filter((task) => !filters.estado || task.estado === filters.estado)
      .filter((task) => !filters.prioridad || task.prioridad === filters.prioridad)
      .filter((task) => !filters.riesgo || task.riesgo === filters.riesgo)
      .filter((task) => !filters.deadline || task.deadline === filters.deadline)
      .filter((task) => {
        if (!search) return true;
        return [task.titulo, task.descripcion, task.proxima_accion, task.pais_o_tramo, task.viaje?.nombre, task.responsable?.nombre]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      })
      .sort((a, b) => sortTasks(a, b, filters.sort));
  }, [filters, tasks]);

  if (!sessionReady) {
    return <main className="p-8 text-sm text-muted">Cargando tablero...</main>;
  }

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-muted">Agencia de viajes</p>
            <h1 className="text-xl font-semibold text-ink">Pendientes logisticos</h1>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <NavButton active={view === "dashboard"} icon={<LayoutDashboard size={16} />} label="Dashboard" onClick={() => setView("dashboard")} />
            <NavButton active={view === "table"} icon={<ListFilter size={16} />} label="Tabla" onClick={() => setView("table")} />
            <NavButton active={view === "kanban"} icon={<Columns3 size={16} />} label="Kanban" onClick={() => setView("kanban")} />
            <NavButton active={view === "travels"} icon={<CalendarClock size={16} />} label="Viajes" onClick={() => setView("travels")} />
            <button className="focus-ring inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white" onClick={() => openTaskModal(null)}>
              <Plus size={16} /> Nueva tarea
            </button>
            <button className="focus-ring rounded-md border border-zinc-300 bg-white p-2 text-muted" title="Salir" onClick={signOut}>
              <LogOut size={17} />
            </button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6">
        {message && <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{message}</div>}
        {view !== "travels" && (
          <TaskFilters filters={filters} setFilters={setFilters} travels={travels} profiles={profiles} tasks={filteredTasks} onImport={importCsv} />
        )}
        {view === "dashboard" && <Dashboard tasks={tasks} travels={travels} profiles={profiles} openTask={openTaskModal} />}
        {view === "table" && <TaskTable tasks={filteredTasks} profiles={profiles} openTask={openTaskModal} deleteTask={deleteTask} />}
        {view === "kanban" && <Kanban tasks={filteredTasks} openTask={openTaskModal} moveTask={moveTask} />}
        {view === "travels" && <TravelManager travels={travels} reload={loadAll} />}
      </section>

      {taskModalOpen && (
        <TaskModal
          task={selectedTask}
          travels={travels}
          profiles={profiles}
          currentUserId={currentUserId}
          close={() => setTaskModalOpen(false)}
          reload={loadAll}
        />
      )}
    </main>
  );

  function openTaskModal(task: Task | null) {
    setSelectedTask(task);
    setTaskModalOpen(true);
  }

  async function moveTask(task: Task, status: TaskStatus) {
    const { error } = await supabase.from("tareas").update({ estado: status, fecha_actualizacion: new Date().toISOString() }).eq("id", task.id);
    if (error) setMessage(error.message);
    await loadAll();
  }

  async function deleteTask(task: Task) {
    if (!confirm(`Eliminar "${task.titulo}"?`)) return;
    const { error } = await supabase.from("tareas").delete().eq("id", task.id);
    if (error) setMessage(error.message);
    await loadAll();
  }

  async function importCsv(file: File) {
    const rows = await parseTaskCsv(file);
    const payload = rows
      .filter((row) => row.titulo)
      .map((row) => ({
        viaje_id: resolveTravelId(row.viaje, travels),
        titulo: row.titulo,
        descripcion: row.descripcion ?? null,
        area: normalizeValue(row.area, AREAS, "Otros"),
        pais_o_tramo: row.pais_o_tramo ?? null,
        responsable_id: resolveProfileId(row.responsable, profiles),
        estado: normalizeValue(row.estado, TASK_STATUSES, "Pendiente"),
        prioridad: normalizeValue(row.prioridad, PRIORITIES, "Media"),
        riesgo: normalizeValue(row.riesgo, RISKS, "Medio"),
        deadline: row.deadline || null,
        proxima_accion: row.proxima_accion ?? null,
        comentarios: row.comentarios ?? null,
        creado_por: currentUserId
      }));
    const { error } = await supabase.from("tareas").insert(payload);
    if (error) setMessage(error.message);
    else setMessage(`${payload.length} tareas importadas.`);
    await loadAll();
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button className={`focus-ring inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${active ? "bg-zinc-900 text-white" : "border border-zinc-300 bg-white text-ink"}`} onClick={onClick}>
      {icon} {label}
    </button>
  );
}

function TaskFilters({ filters, setFilters, travels, profiles, tasks, onImport }: {
  filters: Record<string, string | boolean>;
  setFilters: React.Dispatch<React.SetStateAction<any>>;
  travels: Travel[];
  profiles: Profile[];
  tasks: Task[];
  onImport: (file: File) => void;
}) {
  return (
    <div className="mb-5 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-2.5 text-muted" size={16} />
          <input className="field pl-9" placeholder="Buscar tarea, viaje, responsable..." value={String(filters.search)} onChange={(event) => setFilters((prev: any) => ({ ...prev, search: event.target.value }))} />
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="focus-ring inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-ink">
            <Upload size={16} /> Importar CSV
            <input className="hidden" type="file" accept=".csv" onChange={(event) => event.target.files?.[0] && onImport(event.target.files[0])} />
          </label>
          <button className="focus-ring inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-ink" onClick={() => downloadCsv("tareas-filtradas.csv", exportTasksCsv(tasks))}>
            <Download size={16} /> Exportar CSV
          </button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-8">
        <Select value={String(filters.viaje)} onChange={(value) => setFilters((prev: any) => ({ ...prev, viaje: value }))} options={travels.map((travel) => [travel.id, travel.nombre])} placeholder="Viaje" />
        <Select value={String(filters.responsable)} onChange={(value) => setFilters((prev: any) => ({ ...prev, responsable: value }))} options={profiles.map((profile) => [profile.id, profile.nombre])} placeholder="Responsable" />
        <Select value={String(filters.area)} onChange={(value) => setFilters((prev: any) => ({ ...prev, area: value }))} options={AREAS.map((area) => [area, area])} placeholder="Area" />
        <Select value={String(filters.estado)} onChange={(value) => setFilters((prev: any) => ({ ...prev, estado: value }))} options={TASK_STATUSES.map((status) => [status, status])} placeholder="Estado" />
        <Select value={String(filters.prioridad)} onChange={(value) => setFilters((prev: any) => ({ ...prev, prioridad: value }))} options={PRIORITIES.map((priority) => [priority, priority])} placeholder="Prioridad" />
        <Select value={String(filters.riesgo)} onChange={(value) => setFilters((prev: any) => ({ ...prev, riesgo: value }))} options={RISKS.map((risk) => [risk, risk])} placeholder="Riesgo" />
        <input className="field" type="date" value={String(filters.deadline)} onChange={(event) => setFilters((prev: any) => ({ ...prev, deadline: event.target.value }))} />
        <Select value={String(filters.sort)} onChange={(value) => setFilters((prev: any) => ({ ...prev, sort: value }))} options={[["deadline", "Deadline"], ["prioridad", "Prioridad"], ["fecha_creacion", "Creacion"], ["responsable", "Responsable"]]} placeholder="Orden" />
      </div>
      <label className="mt-3 inline-flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={Boolean(filters.includeResolved)} onChange={(event) => setFilters((prev: any) => ({ ...prev, includeResolved: event.target.checked }))} />
        Mostrar resueltas, canceladas y no aplica
      </label>
    </div>
  );
}

function Dashboard({ tasks, travels, profiles, openTask }: { tasks: Task[]; travels: Travel[]; profiles: Profile[]; openTask: (task: Task) => void }) {
  const open = tasks.filter(isOpenTask);
  const cards = [
    ["Abiertas", open.length],
    ["Vencidas", tasks.filter(isOverdue).length],
    ["Proximos 7 dias", tasks.filter(isDueSoon).length],
    ["Prioridad alta", open.filter((task) => task.prioridad === "Alta").length],
    ["Sin responsable", open.filter((task) => !task.responsable_id).length]
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-5">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-4">
        <MetricList title="Por responsable" data={groupCount(open, (task) => task.responsable?.nombre ?? "Sin responsable")} />
        <MetricList title="Por viaje" data={groupCount(open, (task) => task.viaje?.nombre ?? "Sin viaje")} />
        <MetricList title="Por estado" data={groupCount(tasks, (task) => task.estado)} />
        <MetricList title="Por area" data={groupCount(open, (task) => task.area)} />
      </div>
      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-ink">Pendientes criticos</h2>
        <TaskTable tasks={open.filter((task) => isOverdue(task) || task.prioridad === "Alta" || !task.responsable_id).slice(0, 8)} profiles={profiles} openTask={openTask} compact />
      </section>
      <p className="text-xs text-muted">{travels.length} viajes activos en seguimiento.</p>
    </div>
  );
}

function MetricList({ title, data }: { title: string; data: Record<string, number> }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-ink">{title}</h3>
      <div className="space-y-2">
        {Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, count]) => (
          <div key={label} className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-muted">{label}</span>
            <strong className="text-ink">{count}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskTable({ tasks, openTask, deleteTask, compact = false }: { tasks: Task[]; profiles: Profile[]; openTask: (task: Task) => void; deleteTask?: (task: Task) => void; compact?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
      <table className="w-full min-w-[980px] border-collapse text-left text-sm">
        <thead className="bg-panel text-xs uppercase text-muted">
          <tr>
            <th className="px-3 py-3">Tarea</th>
            <th className="px-3 py-3">Viaje</th>
            <th className="px-3 py-3">Responsable</th>
            <th className="px-3 py-3">Deadline</th>
            <th className="px-3 py-3">Estado</th>
            <th className="px-3 py-3">Prioridad</th>
            {!compact && <th className="px-3 py-3">Riesgo</th>}
            {!compact && <th className="px-3 py-3">Area</th>}
            <th className="px-3 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className={`border-t border-zinc-100 ${isOverdue(task) ? "bg-rose-50/70" : !task.responsable_id ? "bg-amber-50/70" : ""}`}>
              <td className="max-w-xs px-3 py-3">
                <button className="text-left font-semibold text-ink hover:underline" onClick={() => openTask(task)}>{task.titulo}</button>
                <p className="truncate text-xs text-muted">{task.proxima_accion || task.descripcion}</p>
              </td>
              <td className="px-3 py-3 text-muted">{task.viaje?.nombre ?? "Sin viaje"}</td>
              <td className="px-3 py-3 text-muted">{task.responsable?.nombre ?? "Sin responsable"}</td>
              <td className="px-3 py-3">
                <span className={isOverdue(task) ? "font-semibold text-rose-700" : "text-muted"}>{dateLabel(task.deadline)}</span>
              </td>
              <td className="px-3 py-3"><span className={`badge ${statusClass(task.estado)}`}>{task.estado}</span></td>
              <td className="px-3 py-3"><span className={`badge ${priorityClass(task.prioridad)}`}>{task.prioridad}</span></td>
              {!compact && <td className="px-3 py-3"><span className={`badge ${riskClass(task.riesgo)}`}>{task.riesgo}</span></td>}
              {!compact && <td className="px-3 py-3 text-muted">{task.area}</td>}
              <td className="px-3 py-3 text-right">
                {deleteTask && <button className="rounded-md p-2 text-muted hover:bg-zinc-100" title="Eliminar" onClick={() => deleteTask(task)}><X size={16} /></button>}
              </td>
            </tr>
          ))}
          {tasks.length === 0 && (
            <tr><td className="px-3 py-8 text-center text-muted" colSpan={9}>No hay tareas para estos filtros.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Kanban({ tasks, openTask, moveTask }: { tasks: Task[]; openTask: (task: Task) => void; moveTask: (task: Task, status: TaskStatus) => void }) {
  const [dragged, setDragged] = useState<Task | null>(null);
  return (
    <div className="grid gap-3 lg:grid-cols-5">
      {KANBAN_COLUMNS.map((column) => (
        <section key={column.title} className="min-h-[520px] rounded-lg border border-zinc-200 bg-white p-3 shadow-sm" onDragOver={(event) => event.preventDefault()} onDrop={() => dragged && moveTask(dragged, column.statuses[0])}>
          <h2 className="mb-3 flex items-center justify-between text-sm font-semibold text-ink">
            {column.title}
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-muted">{tasks.filter((task) => column.statuses.includes(task.estado)).length}</span>
          </h2>
          <div className="space-y-2">
            {tasks.filter((task) => column.statuses.includes(task.estado)).map((task) => (
              <article key={task.id} draggable onDragStart={() => setDragged(task)} onClick={() => openTask(task)} className={`cursor-pointer rounded-md border p-3 shadow-sm ${isOverdue(task) ? "border-rose-200 bg-rose-50" : !task.responsable_id ? "border-amber-200 bg-amber-50" : "border-zinc-200 bg-white"}`}>
                <h3 className="text-sm font-semibold text-ink">{task.titulo}</h3>
                <p className="mt-1 text-xs text-muted">{task.viaje?.nombre ?? "Sin viaje"} - {task.responsable?.nombre ?? "Sin responsable"}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  <span className={`badge ${priorityClass(task.prioridad)}`}>{task.prioridad}</span>
                  <span className={isOverdue(task) ? "badge border-rose-200 bg-rose-100 text-rose-900" : "badge border-zinc-200 bg-zinc-50 text-muted"}>{dateLabel(task.deadline)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function TaskModal({ task, travels, profiles, currentUserId, close, reload }: {
  task: Task | null;
  travels: Travel[];
  profiles: Profile[];
  currentUserId: string | null;
  close: () => void;
  reload: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<TaskDraft>(task ? {
    id: task.id,
    viaje_id: task.viaje_id ?? "",
    titulo: task.titulo,
    descripcion: task.descripcion ?? "",
    area: task.area,
    pais_o_tramo: task.pais_o_tramo ?? "",
    responsable_id: task.responsable_id ?? "",
    estado: task.estado,
    prioridad: task.prioridad,
    riesgo: task.riesgo,
    deadline: task.deadline ?? "",
    proxima_accion: task.proxima_accion ?? "",
    dependencia: task.dependencia ?? "",
    comentarios: task.comentarios ?? ""
  } : emptyTask);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!task) return;
    supabase.from("tarea_comentarios").select("*, usuario:profiles(nombre,email)").eq("tarea_id", task.id).order("fecha_creacion", { ascending: true })
      .then(({ data }) => setComments((data ?? []) as TaskComment[]));
  }, [task]);

  async function save() {
    if (!draft.titulo.trim()) {
      setError("La tarea necesita un titulo.");
      return;
    }
    if (isOpenStatus(draft.estado) && (!draft.responsable_id || !draft.deadline)) {
      setError("Aviso: una tarea abierta deberia tener responsable y deadline. Se guarda igual para que aparezca como pendiente a corregir.");
    }
    const payload = {
      viaje_id: draft.viaje_id || null,
      titulo: draft.titulo,
      descripcion: draft.descripcion || null,
      area: draft.area,
      pais_o_tramo: draft.pais_o_tramo || null,
      responsable_id: draft.responsable_id || null,
      estado: draft.estado,
      prioridad: draft.prioridad,
      riesgo: draft.riesgo,
      deadline: draft.deadline || null,
      proxima_accion: draft.proxima_accion || null,
      dependencia: draft.dependencia || null,
      comentarios: draft.comentarios || null,
      creado_por: task ? task.creado_por : currentUserId,
      fecha_actualizacion: new Date().toISOString()
    };
    const result = task
      ? await supabase.from("tareas").update(payload).eq("id", task.id)
      : await supabase.from("tareas").insert(payload);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    await reload();
    close();
  }

  async function addComment() {
    if (!task || !newComment.trim()) return;
    const { error: commentError } = await supabase.from("tarea_comentarios").insert({
      tarea_id: task.id,
      usuario_id: currentUserId,
      comentario: newComment
    });
    if (commentError) setError(commentError.message);
    setNewComment("");
    const { data } = await supabase.from("tarea_comentarios").select("*, usuario:profiles(nombre,email)").eq("tarea_id", task.id).order("fecha_creacion", { ascending: true });
    setComments((data ?? []) as TaskComment[]);
  }

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/30 p-4">
      <div className="mt-8 w-full max-w-3xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-200 p-4">
          <h2 className="text-lg font-semibold text-ink">{task ? "Editar tarea" : "Nueva tarea"}</h2>
          <button className="rounded-md p-2 text-muted hover:bg-zinc-100" onClick={close}><X size={18} /></button>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <Field label="Titulo" value={draft.titulo} onChange={(value) => setDraft({ ...draft, titulo: value })} required />
          <Select label="Viaje" value={draft.viaje_id} onChange={(value) => setDraft({ ...draft, viaje_id: value })} options={travels.map((travel) => [travel.id, travel.nombre])} placeholder="Sin viaje" />
          <Select label="Responsable" value={draft.responsable_id} onChange={(value) => setDraft({ ...draft, responsable_id: value })} options={profiles.map((profile) => [profile.id, profile.nombre])} placeholder="Sin responsable" />
          <Field label="Deadline" type="date" value={draft.deadline} onChange={(value) => setDraft({ ...draft, deadline: value })} />
          <Select label="Estado" value={draft.estado} onChange={(value) => setDraft({ ...draft, estado: value as TaskStatus })} options={TASK_STATUSES.map((status) => [status, status])} />
          <Select label="Prioridad" value={draft.prioridad} onChange={(value) => setDraft({ ...draft, prioridad: value as Priority })} options={PRIORITIES.map((priority) => [priority, priority])} />
          <Select label="Riesgo" value={draft.riesgo} onChange={(value) => setDraft({ ...draft, riesgo: value as Risk })} options={RISKS.map((risk) => [risk, risk])} />
          <Select label="Area" value={draft.area} onChange={(value) => setDraft({ ...draft, area: value as Area })} options={AREAS.map((area) => [area, area])} />
          <Field label="Pais o tramo" value={draft.pais_o_tramo} onChange={(value) => setDraft({ ...draft, pais_o_tramo: value })} />
          <Field label="Dependencia" value={draft.dependencia} onChange={(value) => setDraft({ ...draft, dependencia: value })} />
          <Field label="Proxima accion" value={draft.proxima_accion} onChange={(value) => setDraft({ ...draft, proxima_accion: value })} />
          <TextArea label="Descripcion" value={draft.descripcion} onChange={(value) => setDraft({ ...draft, descripcion: value })} />
          <TextArea label="Comentarios internos" value={draft.comentarios} onChange={(value) => setDraft({ ...draft, comentarios: value })} />
        </div>
        {task && (
          <div className="border-t border-zinc-200 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><MessageSquare size={16} /> Historial de comentarios</h3>
            <div className="space-y-2">
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-md border border-zinc-200 bg-panel p-3 text-sm">
                  <p className="text-ink">{comment.comentario}</p>
                  <p className="mt-1 text-xs text-muted">{comment.usuario?.nombre ?? "Usuario"} - {new Date(comment.fecha_creacion).toLocaleString("es-UY")}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input className="field" value={newComment} placeholder="Agregar comentario..." onChange={(event) => setNewComment(event.target.value)} />
              <button className="focus-ring rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold" onClick={addComment}>Comentar</button>
            </div>
          </div>
        )}
        {error && <p className="mx-4 rounded-md bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-zinc-200 p-4">
          <button className="focus-ring rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold" onClick={close}>Cancelar</button>
          <button className="focus-ring inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" onClick={save}><Check size={16} /> Guardar</button>
        </div>
      </div>
    </div>
  );
}

function TravelManager({ travels, reload }: { travels: Travel[]; reload: () => Promise<void> }) {
  const [draft, setDraft] = useState({ nombre: "", temporada: "", destino_principal: "", fecha_inicio: "", fecha_fin: "", estado: "Activo", comentarios: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  async function saveTravel() {
    if (!draft.nombre.trim()) return;
    const payload = { ...draft, fecha_inicio: draft.fecha_inicio || null, fecha_fin: draft.fecha_fin || null };
    const result = editingId ? await supabase.from("viajes").update(payload).eq("id", editingId) : await supabase.from("viajes").insert(payload);
    if (!result.error) {
      setDraft({ nombre: "", temporada: "", destino_principal: "", fecha_inicio: "", fecha_fin: "", estado: "Activo", comentarios: "" });
      setEditingId(null);
      await reload();
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-ink">{editingId ? "Editar viaje" : "Crear viaje"}</h2>
        <div className="space-y-3">
          <Field label="Nombre" value={draft.nombre} onChange={(value) => setDraft({ ...draft, nombre: value })} />
          <Field label="Temporada" value={draft.temporada} onChange={(value) => setDraft({ ...draft, temporada: value })} />
          <Field label="Destino principal" value={draft.destino_principal} onChange={(value) => setDraft({ ...draft, destino_principal: value })} />
          <Field label="Inicio" type="date" value={draft.fecha_inicio} onChange={(value) => setDraft({ ...draft, fecha_inicio: value })} />
          <Field label="Fin" type="date" value={draft.fecha_fin} onChange={(value) => setDraft({ ...draft, fecha_fin: value })} />
          <TextArea label="Comentarios" value={draft.comentarios} onChange={(value) => setDraft({ ...draft, comentarios: value })} />
          <button className="focus-ring w-full rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white" onClick={saveTravel}>Guardar viaje</button>
        </div>
      </section>
      <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        {travels.map((travel) => (
          <div key={travel.id} className="flex flex-col gap-2 border-b border-zinc-100 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-semibold text-ink">{travel.nombre}</h3>
              <p className="text-sm text-muted">{travel.temporada ?? "Sin temporada"} - {travel.destino_principal ?? "Sin destino"} - {dateLabel(travel.fecha_inicio)}</p>
            </div>
            <button className="focus-ring rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold" onClick={() => {
              setEditingId(travel.id);
              setDraft({
                nombre: travel.nombre,
                temporada: travel.temporada ?? "",
                destino_principal: travel.destino_principal ?? "",
                fecha_inicio: travel.fecha_inicio ?? "",
                fecha_fin: travel.fecha_fin ?? "",
                estado: travel.estado,
                comentarios: travel.comentarios ?? ""
              });
            }}>Editar</button>
          </div>
        ))}
      </section>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="label">{label}{required ? " *" : ""}</span>
      <input className="field mt-1" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block md:col-span-2">
      <span className="label">{label}</span>
      <textarea className="field mt-1 min-h-24" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Select({ label, value, onChange, options, placeholder }: { label?: string; value: string; onChange: (value: string) => void; options: string[][]; placeholder?: string }) {
  const input = (
    <select className="field" value={value} onChange={(event) => onChange(event.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
    </select>
  );
  if (!label) return input;
  return <label className="block"><span className="label">{label}</span><div className="mt-1">{input}</div></label>;
}

function normalizeValue<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  const normalized = value?.trim().toLowerCase();
  return allowed.find((item) => item.toLowerCase() === normalized) ?? fallback;
}

function isOpenStatus(status: TaskStatus) {
  return status === "Pendiente" || status === "En gestion" || status === "Esperando respuesta";
}

function sortTasks(a: Task, b: Task, sort: string) {
  if (sort === "prioridad") {
    const order = { Alta: 0, Media: 1, Baja: 2 };
    return order[a.prioridad] - order[b.prioridad];
  }
  if (sort === "fecha_creacion") return new Date(a.fecha_creacion).getTime() - new Date(b.fecha_creacion).getTime();
  if (sort === "responsable") return (a.responsable?.nombre ?? "zzz").localeCompare(b.responsable?.nombre ?? "zzz");
  return (a.deadline ?? "9999-12-31").localeCompare(b.deadline ?? "9999-12-31");
}
