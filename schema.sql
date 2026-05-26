create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key,
  nombre text not null,
  email text not null unique,
  rol text not null default 'Operativo' check (rol in ('Admin', 'Coordinador', 'Operativo', 'Solo lectura')),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.viajes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  temporada text,
  destino_principal text,
  fecha_inicio date,
  fecha_fin date,
  estado text not null default 'Activo' check (estado in ('Activo', 'Planificacion', 'Finalizado', 'Pausado')),
  comentarios text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tareas (
  id uuid primary key default gen_random_uuid(),
  viaje_id uuid references public.viajes(id) on delete set null,
  titulo text not null,
  descripcion text,
  area text not null default 'Otros' check (area in ('Vuelos', 'Alojamiento', 'Transporte', 'Comidas', 'Entradas', 'Guias', 'Seguros', 'Documentacion', 'Kits', 'Comunicacion', 'Pagos', 'Proveedores', 'Otros')),
  pais_o_tramo text,
  responsable_id uuid references public.profiles(id) on delete set null,
  estado text not null default 'Pendiente' check (estado in ('Pendiente', 'En gestion', 'Esperando respuesta', 'Resuelto', 'Cancelado', 'No aplica')),
  prioridad text not null default 'Media' check (prioridad in ('Alta', 'Media', 'Baja')),
  riesgo text not null default 'Medio' check (riesgo in ('Alto', 'Medio', 'Bajo')),
  deadline date,
  proxima_accion text,
  dependencia text,
  fecha_creacion timestamptz not null default now(),
  fecha_actualizacion timestamptz not null default now(),
  creado_por uuid,
  comentarios text
);

create table if not exists public.tarea_comentarios (
  id uuid primary key default gen_random_uuid(),
  tarea_id uuid not null references public.tareas(id) on delete cascade,
  usuario_id uuid references public.profiles(id) on delete set null,
  comentario text not null,
  fecha_creacion timestamptz not null default now()
);

create index if not exists tareas_viaje_idx on public.tareas(viaje_id);
create index if not exists tareas_responsable_idx on public.tareas(responsable_id);
create index if not exists tareas_estado_idx on public.tareas(estado);
create index if not exists tareas_deadline_idx on public.tareas(deadline);
create index if not exists comentarios_tarea_idx on public.tarea_comentarios(tarea_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_tarea_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.fecha_actualizacion = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists viajes_updated_at on public.viajes;
create trigger viajes_updated_at before update on public.viajes
for each row execute function public.set_updated_at();

drop trigger if exists tareas_updated_at on public.tareas;
create trigger tareas_updated_at before update on public.tareas
for each row execute function public.set_tarea_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, email, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email,
    'Operativo'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.viajes enable row level security;
alter table public.tareas enable row level security;
alter table public.tarea_comentarios enable row level security;

drop policy if exists "Usuarios autenticados leen perfiles" on public.profiles;
create policy "Usuarios autenticados leen perfiles"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "Usuarios autenticados editan perfiles" on public.profiles;
create policy "Usuarios autenticados editan perfiles"
on public.profiles for all
to authenticated
using (true)
with check (true);

drop policy if exists "Usuarios autenticados gestionan viajes" on public.viajes;
create policy "Usuarios autenticados gestionan viajes"
on public.viajes for all
to authenticated
using (true)
with check (true);

drop policy if exists "Usuarios autenticados gestionan tareas" on public.tareas;
create policy "Usuarios autenticados gestionan tareas"
on public.tareas for all
to authenticated
using (true)
with check (true);

drop policy if exists "Usuarios autenticados gestionan comentarios" on public.tarea_comentarios;
create policy "Usuarios autenticados gestionan comentarios"
on public.tarea_comentarios for all
to authenticated
using (true)
with check (true);

insert into public.profiles (id, nombre, email, rol, activo) values
  ('00000000-0000-0000-0000-000000000101', 'Ana Coordinacion', 'ana@demo.local', 'Coordinador', true),
  ('00000000-0000-0000-0000-000000000102', 'Bruno Operaciones', 'bruno@demo.local', 'Operativo', true),
  ('00000000-0000-0000-0000-000000000103', 'Carla Proveedores', 'carla@demo.local', 'Operativo', true),
  ('00000000-0000-0000-0000-000000000104', 'Diego Lectura', 'diego@demo.local', 'Solo lectura', true)
on conflict (email) do nothing;

insert into public.viajes (id, nombre, temporada, destino_principal, fecha_inicio, fecha_fin, estado, comentarios) values
  ('10000000-0000-0000-0000-000000000101', 'Africa SS 26', 'SS 26', 'Tanzania y Zanzibar', '2026-01-12', '2026-01-29', 'Activo', 'Circuito recreativo grupal.'),
  ('10000000-0000-0000-0000-000000000102', 'Machu SS 26', 'SS 26', 'Peru', '2026-02-04', '2026-02-13', 'Planificacion', 'Revisar cupos de tren.'),
  ('10000000-0000-0000-0000-000000000103', 'Universitarios Febrero', 'Febrero', 'Brasil', '2026-02-15', '2026-02-23', 'Activo', null),
  ('10000000-0000-0000-0000-000000000104', 'Expediciones', 'Anual', 'Varios', null, null, 'Activo', 'Linea abierta para salidas especiales.')
on conflict (id) do nothing;

insert into public.tareas (
  viaje_id, titulo, descripcion, area, pais_o_tramo, responsable_id, estado, prioridad, riesgo, deadline, proxima_accion, dependencia, creado_por, comentarios
) values
  ('10000000-0000-0000-0000-000000000101', 'Cotizar vuelo EBB -> ZNZ', 'Comparar alternativas de llegada a Zanzibar.', 'Vuelos', 'EBB -> ZNZ', '00000000-0000-0000-0000-000000000102', 'Pendiente', 'Alta', 'Alto', current_date + 2, 'Pedir tarifa final a operador aereo', null, '00000000-0000-0000-0000-000000000101', null),
  ('10000000-0000-0000-0000-000000000101', 'Confirmar alternativa DAR -> SEU vs JRO', 'Definir tramo mas conveniente por horarios y costo.', 'Transporte', 'DAR -> SEU / JRO', '00000000-0000-0000-0000-000000000103', 'En gestion', 'Alta', 'Medio', current_date + 5, 'Esperar respuesta del receptivo', 'Cotizacion terrestre', '00000000-0000-0000-0000-000000000101', null),
  ('10000000-0000-0000-0000-000000000104', 'Validar hotel en Cairo', 'Revisar ubicacion, categoria y politica de grupos.', 'Alojamiento', 'Cairo', '00000000-0000-0000-0000-000000000103', 'Esperando respuesta', 'Media', 'Medio', current_date + 7, 'Reclamar ficha tecnica', null, '00000000-0000-0000-0000-000000000101', null),
  ('10000000-0000-0000-0000-000000000101', 'Pedir rooming list de Africa SS 26', 'Solicitar ultima version al equipo comercial.', 'Alojamiento', 'Tanzania', '00000000-0000-0000-0000-000000000101', 'Pendiente', 'Media', 'Bajo', current_date + 1, 'Pedir archivo actualizado', null, '00000000-0000-0000-0000-000000000101', null),
  ('10000000-0000-0000-0000-000000000103', 'Confirmar pago a proveedor de transporte', 'Validar comprobante y fecha de acreditacion.', 'Pagos', 'Florianopolis', null, 'Pendiente', 'Alta', 'Alto', current_date - 1, 'Asignar responsable y confirmar pago', null, '00000000-0000-0000-0000-000000000101', 'Tarea demo sin responsable.'),
  ('10000000-0000-0000-0000-000000000102', 'Revisar documentacion pendiente de pasajeros', 'Controlar pasaportes, vacunas y permisos.', 'Documentacion', 'Peru', '00000000-0000-0000-0000-000000000102', 'En gestion', 'Alta', 'Alto', current_date - 2, 'Actualizar lista de faltantes', null, '00000000-0000-0000-0000-000000000101', null),
  ('10000000-0000-0000-0000-000000000101', 'Enviar mensaje informativo al grupo', 'Enviar recordatorio de equipaje y documentacion.', 'Comunicacion', 'General', '00000000-0000-0000-0000-000000000101', 'Resuelto', 'Baja', 'Bajo', current_date - 3, 'Mensaje enviado', null, '00000000-0000-0000-0000-000000000101', null)
on conflict do nothing;

insert into public.tarea_comentarios (tarea_id, usuario_id, comentario)
select id, '00000000-0000-0000-0000-000000000101', 'Comentario demo: revisar este pendiente en la reunion operativa.'
from public.tareas
where titulo = 'Cotizar vuelo EBB -> ZNZ'
on conflict do nothing;
