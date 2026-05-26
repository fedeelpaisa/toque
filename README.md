# Logistica de viajes

MVP interno para controlar pendientes operativos de viajes grupales. El foco es que cada pendiente tenga tarea, responsable, deadline y estado, con dashboard, tabla, Kanban, comentarios e importacion/exportacion CSV.

## Arquitectura simple

- **Next.js App Router + TypeScript** para la interfaz y rutas.
- **Tailwind CSS** para una UI operativa, clara y responsive.
- **Supabase Auth** para login con email y password.
- **Supabase Postgres** para `profiles`, `viajes`, `tareas` y `tarea_comentarios`.
- **RLS basico**: usuarios autenticados pueden operar el MVP completo.
- **CSV en cliente**: importacion con Papa Parse y exportacion directa de tareas filtradas.
- **Deploy en Vercel**: solo necesita variables publicas de Supabase.

## Estructura

```txt
src/app/login       Login
src/app/dashboard   Dashboard operativo
src/app/tareas      Tabla, filtros, CSV y detalle de tareas
src/app/viajes      CRUD simple de viajes
src/components      Componentes principales del MVP
src/lib             Tipos, Supabase, formatos y CSV
supabase/schema.sql Tablas, RLS, trigger de perfil y datos demo
```

## Configuracion local

1. Instalar dependencias:

```bash
npm install
```

2. Crear `.env.local`:

```bash
cp .env.example .env.local
```

3. Completar:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

4. En Supabase, abrir **SQL Editor** y ejecutar:

```txt
supabase/schema.sql
```

5. Crear un usuario en **Authentication > Users**. El trigger crea su perfil automaticamente.

6. Correr la app:

```bash
npm run dev
```

Abrir `http://localhost:3000`.

## CSV

Columnas aceptadas para importar tareas:

```csv
viaje,titulo,descripcion,area,pais_o_tramo,responsable,estado,prioridad,riesgo,deadline,proxima_accion,comentarios
Africa SS 26,Cotizar vuelo EBB -> ZNZ,Comparar alternativas,Vuelos,EBB -> ZNZ,Bruno Operaciones,Pendiente,Alta,Alto,2026-06-01,Pedir tarifa final,
```

Para `viaje` se usa el nombre exacto del viaje. Para `responsable` se acepta nombre o email del perfil.

## Deploy en Vercel

1. Subir el repo a GitHub.
2. Crear proyecto en Vercel e importar el repo.
3. Agregar las variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.

## Notas del MVP

- Las tareas resueltas, canceladas y no aplica quedan ocultas por defecto y se pueden mostrar con el filtro.
- Las tareas vencidas abiertas se resaltan visualmente.
- Las tareas abiertas sin responsable se resaltan y aparecen en dashboard.
- El Kanban permite arrastrar tareas entre columnas y actualiza el estado.
- Los roles quedan modelados en base de datos para evolucionar permisos mas adelante.
