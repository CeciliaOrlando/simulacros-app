# Sistema de Simulacros

Web app para que gerentes de distintas empresas programen simulacros de emergencia
(sismo, incendio, evacuación) y avisen a sus empleados por mail y SMS.

## Stack
- Next.js (App Router, TypeScript, Tailwind)
- Supabase (Auth + Postgres con Row Level Security)

## Puesta en marcha
1. `npm install`
2. Copiar `.env.example` a `.env.local` y completar las claves de Supabase.
3. Ejecutar `supabase/migrations/001_inicial.sql` en el SQL Editor de Supabase.
4. `npm run dev`

## Estructura
- `src/lib/supabase/` — clientes de Supabase (navegador, servidor y proxy/middleware).
- `src/proxy.ts` — protege todas las rutas salvo `/login` (en Next.js 16 el middleware se llama "proxy").
- `src/app/login` — inicio de sesión.
- `src/app/panel` — panel con Empleados, Simulacros y Reportes.
- `src/app/api/cron` — envía los avisos por mail 48 h antes (requiere `Authorization: Bearer $CRON_SECRET`).
- `src/lib/avisos.ts` — envío de avisos con Brevo y registro en `envios`.

## Probar el cron a mano
```bash
curl -H "Authorization: Bearer $(grep '^CRON_SECRET=' .env.local | cut -d= -f2)" http://localhost:3000/api/cron
```
