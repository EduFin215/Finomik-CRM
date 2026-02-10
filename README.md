# Finomik CRM

CRM de ventas para software educativo (escuelas e instituciones). Incluye pipeline Kanban, lista de centros, calendario, importación Excel, integración con Google Calendar y avisos.

## Requisitos

- Node.js 18+
- Cuenta en [Supabase](https://supabase.com) (gratis)
- Opcional: proyecto en [Google Cloud Console](https://console.cloud.google.com) para Google Calendar

## Instalación

```bash
npm install
```

## Configuración

1. Copia `.env.example` a `.env`.
2. **Supabase**: Crea un proyecto en supabase.com. En SQL Editor, ejecuta el contenido de `supabase/schema.sql`. En Project Settings > API copia la **Project URL** y la clave **anon public** (es un token largo que empieza por `eyJ...`; usa esa, no la "service_role" ni claves con formato `sb_publishable_...`) a `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. **Google Calendar** (opcional): Crea un proyecto en Google Cloud, activa "Google Calendar API", crea credenciales OAuth 2.0 (tipo aplicación web) y añade en Autorized redirect URIs tu origen (p. ej. `http://localhost:3000`). Copia el Client ID a `.env` como `VITE_GOOGLE_CLIENT_ID`.

## Desarrollo

```bash
npm run dev
```

Abre http://localhost:3000.

## Build

```bash
npm run build
npm run preview
```

## Funcionalidades

- **Dashboard**: Resumen y gráficos del pipeline.
- **Pipeline (Kanban)**: Arrastra tarjetas entre columnas para cambiar la fase.
- **Lista de escuelas**: Tabla con filtros por fase y estado comercial.
- **Calendario**: Tareas y reuniones; botón "Sincronizar Google Calendar" para conectar con Google y recibir recordatorios.
- **Importar Excel**: Sube .xlsx/.csv con columnas: nombre del centro, ubicación, teléfono, email, persona de contacto.
- **Detalle de centro**: Ficha, seguimiento, tareas e historial de actividades. Al agendar un seguimiento puedes marcar "Añadir a Google Calendar".
- **Avisos**: Si permites notificaciones en el navegador, recibirás avisos de tareas en los próximos 15 minutos. Los eventos enviados a Google Calendar usan los recordatorios nativos de Google.

### Módulo de Facturación e IVA España (MVP)

- **Contratos**: Definición de contratos recurrentes por centro (mensual, trimestral, anual) vinculados al CRM.
- **Facturas y cobros**: Listado de facturas emitidas, detalle de líneas y cobros asociados para centros españoles.
- **IVA / Modelos**: Resumen de bases y cuotas de IVA repercutido y export a CSV pensado para preparar los modelos 303 y 390 de la AEAT.
- Nota: este módulo es aún un **MVP de facturación + IVA** para España; no cubre compras, bancos ni contabilidad completa como un ERP generalista.

## Estructura

- `App.tsx`: Layout, navegación y estado global (React Query).
- `components/`: Vistas (Dashboard, Pipeline, Table, Calendar, Importer, SchoolDetail, NewSchoolModal).
- `services/supabase.ts`: Cliente Supabase.
- `services/schools.ts`: CRUD de escuelas, actividades y tareas.
- `services/googleCalendar.ts`: OAuth y creación de eventos en Google Calendar.
- `hooks/useUpcomingReminders.ts`: Notificaciones del navegador para tareas próximas.
- `supabase/schema.sql`: Esquema de tablas y RLS para ejecutar en Supabase.

## Seguridad (producción)

- **Registro de usuarios**: La app solo muestra inicio de sesión. Para evitar que nadie se registre por API, en Supabase Dashboard > Authentication > Providers > Email desactiva **"Enable email signup"**.
- **Variables de entorno**: No subas `.env` al repositorio (está en `.gitignore`). Usa solo la clave **anon** en el frontend; nunca la `service_role`.
- **HTTPS**: Sirve la app por HTTPS en producción.
