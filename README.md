# Flight Radius Finder (MVP)

A deployable Next.js MVP that helps users pick a point on a map, choose a radius, and view mock flights from airports inside that radius.

## Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- Leaflet (client-side via dynamic import)

## Features

- Clickable map to select geographic center
- Radius presets: 50 / 100 / 200 / 300 km
- Static airport dataset (mock)
- Haversine radius filtering
- Destination input
- Date input
- Mock flight results (no external API)

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Build for production

```bash
npm run build
npm run start
```

## Deploy to Vercel

1. Push this repo to GitHub/GitLab/Bitbucket.
2. Import project in Vercel.
3. Keep default settings (Framework: Next.js).
4. Deploy.

No API keys are required for this MVP.
