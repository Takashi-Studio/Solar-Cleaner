# Project: Solar Panel Cleaning SaaS Frontend Redesign

## Architecture
- React Single Page App (Vite + TypeScript + Tailwind CSS)
- Routing: Hash routing for top-level pages (`#/login`, `#/dashboard`, `#/admin/overview`), local tab routing for dashboard views.
- Styling: Premium minimalist design using dark-blue atmosphere (`#0a0f1a`), glassmorphic cards (`glass-panel` with `backdrop-blur-md`), neon indicators, Cairo typography.
- Telemetry: Real-time telemetry via short polling API endpoints.
- Authentication: JWT stored in localStorage.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Explore & Baseline Build | Investigate current layout, test building frontend to check baseline and compile environment | None | DONE |
| 2 | Navigation & Sidebar Drawer | Rebuild App.tsx / Dashboard.tsx layout to use mobile-first sidebar drawer and desktop sidebar | M1 | DONE |
| 3 | Home Tab Redesign | Implement Home tab displaying Central Water Level ring (SVG) and summary stats | M2 | DONE |
| 4 | Units List & Control Icons | Implement Units tab with state badges and clean Lucide play/stop icons | M2 | DONE |
| 5 | Unit Details Drawer | Advanced control sheet, manual motor control buttons, schedules, and unit timelines | M4 | DONE |
| 6 | Logs & Settings Tabs | General logs search/filter and profile options / settings tabs | M2 | DONE |
| 7 | Verification & Build | Verify E2E logic, run build commands, check compliance with specs | M3, M5, M6 | DONE |

## Code Layout
- `frontend/src/App.tsx` - Application entry point and role-based routing.
- `frontend/src/components/Dashboard.tsx` - Main customer dashboard containing views, layout, and tabs.
- `frontend/src/components/AdminPanel.tsx` - System administrator panel.
- `frontend/src/components/WaterGauge.tsx` - Circular/wave water level indicator.
- `frontend/src/index.css` - Custom CSS overrides and animations.
- `frontend/tailwind.config.js` - Color configurations for Tailwind.
