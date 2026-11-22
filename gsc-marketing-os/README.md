# GSC Digital Marketing OS
*Research. Strategize. Create. Publish. Analyze. Grow.*

Internal marketing command center for Global Sky Clean — React (Vite) + Tailwind + Recharts + Lucide, Supabase (Auth + Postgres with RLS + Edge Function).

## Modules
Dashboard (configurable, date filters) · Market research (industry, audience profiles, competitors, trends) · SEO & keyword mapping · Content strategy (pillars, strategy matrix, weekly structure, monthly goals) · Campaigns (budget, CPL, ROI) · Idea workspace (template-based generator + AI) · Editorial calendar (month/week/day/kanban/list, drag-and-drop, duplicate, repurpose) · Script & copy studio (7 structures, scene-by-scene, autosave, PDF) · Production (pipeline, approval & revision log, tasks, ground-level shot list, asset library) · Social media workspaces (5 platforms, manual publishing checklist) · Analytics (manual/CSV, source labelling, rule-based recommendations, PDF report) · Leads funnel & monthly report · Learning center (14 modules) · AI assistant · Settings (members, sample data, JSON backup/restore, CSV export).

## Backend (already provisioned)
- Supabase project **GSC Toolkit** (`mymobrwoiqeocymdxqkf`, ap-southeast-1)
- Tables: `mkt_workspaces`, `mkt_members`, `mkt_records` (RLS: only workspace members can read; owner/editor can write). Migration: `supabase/migrations/001_gsc_marketing_os.sql`
- Edge Function `gsc-ai` (requires signed-in user). Enable AI by adding secret `ANTHROPIC_API_KEY` (optional `ANTHROPIC_MODEL`) in Supabase → Edge Functions → Secrets.
- Frontend uses only the **publishable** key (`.env`). Never put service-role keys in the frontend.

## Supabase Auth settings (one-time)
Authentication → URL Configuration:
- Site URL: `https://gsc-marketing-os.netlify.app`
- Redirect URLs: `https://gsc-marketing-os.netlify.app/**`

## Develop
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs dist/
```

## Deploy (Netlify project: gsc-marketing-os)
- Quick: Netlify → project **gsc-marketing-os** → Deploys → drag the `dist` folder onto the drop zone.
- CLI: `npx netlify-cli deploy --prod --dir=dist --site=01ceebc0-f081-44d8-8e0e-2a908cfb8706`
- Continuous: push this folder to a Git repo and link it in Netlify (build: `npm run build`, publish: `dist`; `netlify.toml` included). Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as build env vars if `.env` is not committed.
