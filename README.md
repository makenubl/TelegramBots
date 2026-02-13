# Telegram AI Agents Dashboard

A live dashboard that showcases your six AI agents with Telegram-style activity, personalities, and editable configuration (Telegram ID + display picture).

## Features
- Real-time activity stream (demo-friendly)
- 6 agent profiles with personalities and schedules
- Per-agent configuration: Telegram ID + display picture URL
- WebSocket live updates + REST stats

## Quick Start

```bash
npm run install-all
npm run dev
```

Then open `http://localhost:5173`.

## Project Structure
- `server/` Express + WebSocket backend
- `client/` Vite + React dashboard
- `scripts/smoke.js` tiny runner to verify bot message generation

## Demo Notes
- The server continuously simulates agent messages.
- Use the config fields to enter Telegram IDs and custom DP URLs.
