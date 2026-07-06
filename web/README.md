# AutoPalExpress: Palworld Server Admin Panel

A dark-fantasy administration dashboard for a Palworld dedicated server.

Mods and Nexus Mods integration are wired to a real backend (see `../README.md` at the repo root; it needs to be running for the Mods page and Nexus connection to work). Everything else (server status, players, logs, settings, server connection) still goes through a mock API service layer (`src/api/`) with simulated latency and in-memory state.

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
    httpClient.ts   real fetch() wrapper (used by modsApi/nexusApi)
    modsApi.ts      real: calls the FastAPI backend's /api/mods/*
    nexusApi.ts     real: calls the FastAPI backend's /api/integrations/nexus/*
    serverApi.ts, playersApi.ts, logsApi.ts, settingsApi.ts, connectionApi.ts
                    still mocked: thin async wrappers with a comment naming the
                    REST endpoint each stands in for; swap the body for a fetch()
                    call when a real backend exists for those domains too
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
    settings/     ServerConnectionPanel, NexusIntegrationPanel
  pages/          Dashboard, Players, Mods, ServerControl, Logs, Settings
  hooks/          useServerStatus (polling), useNotifications (magic toast system)
```
