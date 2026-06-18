# Original User Request

## Initial Request — 2026-06-17T08:14:59+03:00

Rebuild the frontend of the Solar Panel Cleaning SaaS system to feature a completely redesigned, mobile-first, minimalist, icon-based user interface using Stitch's premium design principles.

Working directory: `C:\Users\Takashi Sensei\Documents\antigravity\goofy-einstein`
Integrity mode: development

## Requirements

### R1. Mobile-First Sidebar Navigation (قائمة جانبية)
- Rebuild the navigation in App.tsx and components to use a modern sidebar.
- On mobile devices, the sidebar should behave as a slide-out drawer triggered by a minimalist hamburger menu button. On larger screens (desktop/tablet), it should be a sleek persistent or collapsible sidebar.
- The sidebar must feature high-quality minimalist icons for each tab:
  1. Home (الرئيسية): General status, Central Water Level ring, quick stats.
  2. Units (الوحدات): List of cleaning units, state badges, manual quick triggers.
  3. Logs (السجلات): Detailed historical lists of cleaning events and statuses.
  4. Settings/Profile (الملف الشخصي): Theme options, profile details, and logout.

### R2. Minimalist, Icon-Based UI
- Replace traditional text-based buttons (e.g., "بدء التنظيف", "إيقاف طارئ") with simple, intuitive, and modern icons (using lucide-react or heroicons).
- Use interactive elements with clear active/disabled visual states. For example:
  - Green circular play icon for starting a clean.
  - Red flashing/glowing pause/stop icon for emergency stops.
  - Minimalist directional buttons for manual stepper control.
- Apply high-fidelity aesthetics: a curated deep dark-blue background (#0a0f1a), glassmorphism cards (backdrop-blur-md), vibrant neon colors for indicators, and modern typography (Cairo font).

### R3. Maintain API and Telemetry Integration
- Preserve all existing backend integration, API calls, and MQTT telemetry handlers (such as real-time water level updates, state transitions like CLEANING, RETURNING_HOME, WATER_LOW, and historical logs).
- Retain the current user authentication flow (JWT token and user info stored in localStorage).

## Acceptance Criteria

### Design & Usability
- [ ] The app uses a collapsible, slide-out drawer sidebar (hamburger menu) for mobile navigation, and a sidebar layout on desktop.
- [ ] Bulky text-only control buttons are replaced with clean, interactive icons (e.g., Lucide icons) that have clear tooltips or subtle micro-labels where necessary.
- [ ] The dashboard retains the Central Water Level ring (SVG circular indicator) and changes color dynamically depending on the level (Blue for full, Red for <= 20%).

### Technical Integrity & Build
- [ ] The frontend project builds successfully with npm run build without any TypeScript or Vite compilation errors.
- [ ] No existing backend API endpoints or state management logic are broken; the app correctly signs in, fetches cleaning units, receives MQTT-driven updates, logs actions, and modifies schedules.
