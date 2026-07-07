# AutoPalExpress: Palworld Server Admin Panel

A dark-fantasy administration dashboard for a Palworld dedicated server.

Most major pages are wired to the real FastAPI backend (see `../README.md` at the repo root; it needs to be running for live data). Mods/Nexus, server control, players, logs, world settings, instances, automation, users, networking, and UE4SS all call backend APIs. Only a few legacy surfaces remain frontend-only, mainly the general settings mock and player actions Palworld RCON does not support.

## Stack

React 19 + TypeScript + Vite, Tailwind CSS v4 (CSS-based theme, no config file), Framer Motion, Radix UI primitives (styled from scratch to match the theme), lucide-react, react-router-dom.

## Run it

```bash
cd web
npm install
npm run dev
```

Then open the printed local URL (defaults to http://localhost:5173). The dev server proxies `/api/*` to `http://127.0.0.1:8000` (see `vite.config.ts`), so also start the backend; see the repo root README.

`npm run build` produces a production bundle in `dist/`. `npx tsc -b` type-checks without emitting.

## Structure

```
src/
  api/
    httpClient.ts   real fetch() wrapper
    modsApi.ts      calls /api/mods/*
    nexusApi.ts     calls /api/integrations/nexus/*
    logsApi.ts      calls /api/logs/*
    settingsApi.ts  legacy mocked general settings API
  types/models.ts shared data models (ServerStatus, Player, Mod, NexusModResult, ...)
  components/
    ui/           bare Radix-based primitives (button, dialog, tabs, switch, select, ...)
    fantasy/      themed, reusable pieces: RuneButton, SpellCard, CrystalStatus, ScrollPanel,
                  EnchantedToggle, RuneDialog, ManaProgressBar, MagicNotification, GuildTable,
                  AncientTabs, FloatingActionOrb, StatTile, AmbientEmbers
    layout/       Sidebar, TopBar, AppShell (route outlet + floating action orb)
    players/      PlayerCard
    mods/         ModCard (drag-to-reorder via Framer Motion's Reorder),
                  NexusBrowseDialog / NexusModBrowser / NexusModCard (real Nexus Mods browsing)
    settings/     NexusIntegrationPanel and super-admin configuration panels
  pages/          Dashboard, Mods, ServerControl, WorldSettings, Logs, Settings, SuperAdmin
  hooks/          useServerStatus (polling), useNotifications (magic toast system)
```
